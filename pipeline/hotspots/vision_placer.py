"""Placement automatique des hotspots par modèle de vision.

Deux backends sélectionnables via --backend :

  moondream  — Moondream cloud API (gratuit, clé sans CB).
               Conçu pour la tâche « point to X » : retourne des
               coordonnées (x, y) directement.
               Nécessite MOONDREAM_API_KEY dans .env
               (free tier : https://moondream.ai/)

  pixtral    — Pixtral via Scaleway (crédits existants, fallback).
               Floats directs — moins fiable qu'un modèle dédié.

Usage :
    python3.11 -m pipeline.main place-hotspots --backend moondream
    python3.11 -m pipeline.main place-hotspots --backend pixtral
"""

from __future__ import annotations

import base64
import io
import json
import re
import time
from typing import Any

import requests
from PIL import Image

from .. import config

BACKENDS = ("moondream", "pixtral")

# IIIF resize cap — avoid sending the Night Watch at 14k px to the model.
_IIIF_MAX_PX = 1024


# ---------------------------------------------------------------------------
# Shared image utilities
# ---------------------------------------------------------------------------

def _iiif_resized(image_url: str) -> str:
    return re.sub(r"/full/[^/]+/", f"/full/!{_IIIF_MAX_PX},{_IIIF_MAX_PX}/", image_url)


def _download_bytes(image_url: str) -> bytes:
    resp = requests.get(image_url, timeout=30)
    resp.raise_for_status()
    return resp.content


def _to_data_url(raw: bytes, content_type: str = "image/jpeg") -> str:
    return f"data:{content_type};base64,{base64.b64encode(raw).decode()}"


def _clamp(v: float) -> float:
    return round(max(0.0, min(1.0, v)), 3)


# ---------------------------------------------------------------------------
# Backend: Moondream (local, open-source, designed for point tasks)
# ---------------------------------------------------------------------------

# Moondream client is loaded lazily and cached across hotspots.
# The `moondream` PyPI package is a cloud-API wrapper — it needs MOONDREAM_API_KEY.
# Get a free key (no credit card) at https://moondream.ai/
_moondream_model = None


def _get_moondream():
    global _moondream_model
    if _moondream_model is None:
        try:
            import moondream as md
        except ImportError:
            import sys
            raise RuntimeError(
                "moondream not installed for this interpreter.\n"
                f"Run:  {sys.executable} -m pip install moondream --break-system-packages"
            )
        api_key = _env("MOONDREAM_API_KEY")
        if not api_key:
            raise RuntimeError(
                "MOONDREAM_API_KEY not set.\n"
                "Get a free key (no credit card) at https://moondream.ai/\n"
                "Then add it to your .env:  MOONDREAM_API_KEY=<key>"
            )
        _moondream_model = md.vl(api_key=api_key)
        print("[moondream] client ready.")
    return _moondream_model


def _env(key: str) -> str | None:
    """Read env var; guarded so importing the module needs no --allow-env."""
    try:
        import os
        return os.environ.get(key)
    except Exception:
        return None


def _moondream_query(h: dict) -> str:
    """Build a concise query from the hotspot title + first sentence of narration."""
    narration = (h.get("narration_text") or "").strip()
    if narration:
        first = re.split(r"[.!?]", narration)[0].strip()
        return f"{h['title']} — {first}"
    return h["title"]


def _place_moondream(model, encoded_image, h: dict) -> dict[str, float] | None:
    query = _moondream_query(h)
    print(f"  query: {query!r}")
    try:
        result = model.point(encoded_image, query)
    except Exception as exc:
        print(f"  [moondream] error: {exc}")
        return None

    points = (result or {}).get("points", [])
    if not points:
        print("  [moondream] no points returned")
        return None
    pt = points[0]
    return {"x": _clamp(pt["x"]), "y": _clamp(pt["y"])}


# ---------------------------------------------------------------------------
# Backend: Pixtral direct floats (fallback — LLMs are mediocre at this)
# ---------------------------------------------------------------------------

def _pixtral_prompt(artwork_title: str, artist_name: str, h: dict) -> str:
    narration = (h.get("narration_text") or "").strip()
    desc_line = f"\nContext: {narration}" if narration else ""
    return (
        f'You are analyzing the painting "{artwork_title}" by {artist_name}.\n\n'
        f'Locate the CENTER of this detail: "{h["title"]}" ({h["aspect"]})'
        f"{desc_line}\n\n"
        "Reply with ONLY a JSON object on a single line:\n"
        '{"x": <float 0.0–1.0>, "y": <float 0.0–1.0>}\n\n'
        "x=0 = left edge, x=1 = right edge. y=0 = top, y=1 = bottom."
    )


def _place_pixtral(
    data_url: str, artwork_title: str, artist_name: str, h: dict
) -> dict[str, float] | None:
    if not config.SCW_BASE_URL or not config.SCW_API_KEY:
        raise RuntimeError("SCW_BASE_URL / SCW_API_KEY not set in .env")

    resp = requests.post(
        f"{config.SCW_BASE_URL}/chat/completions",
        json={
            "model": config.SCW_VISION_MODEL,
            "temperature": 0,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": _pixtral_prompt(artwork_title, artist_name, h)},
                {"type": "image_url", "image_url": {"url": data_url}},
            ]}],
        },
        headers={
            "Authorization": f"Bearer {config.SCW_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=60,
    )
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"].strip()
    print(f"  model answered: {raw!r}")

    match = re.search(r'\{[^{}]+\}', raw)
    if not match:
        print("  [pixtral] no JSON in reply")
        return None
    try:
        coords = json.loads(match.group())
        return {"x": _clamp(float(coords["x"])), "y": _clamp(float(coords["y"]))}
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        print(f"  [pixtral] parse error: {exc}")
        return None


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def place(
    artwork_title: str,
    artist_name: str,
    image_url: str,
    hotspots: list[dict[str, Any]],
    backend: str = "moondream",
    delay: float = 1.5,
) -> list[dict[str, Any]]:
    """
    For each hotspot dict (keys: title, aspect, narration_text, x, y, …),
    call the selected backend to replace x/y with the model's estimate.
    Falls back to the existing coords on failure.
    """
    if backend not in BACKENDS:
        raise ValueError(f"backend must be one of {BACKENDS}")

    resized_url = _iiif_resized(image_url)
    print(f"[vision/{backend}] downloading image: {resized_url}")

    try:
        raw_bytes = _download_bytes(resized_url)
    except Exception as exc:
        print(f"[vision/{backend}] image download failed ({exc}) — keeping original coords")
        return hotspots

    # Prepare backend-specific resources once, reuse across all hotspots.
    moondream_model = None
    moondream_encoded = None
    data_url = None

    if backend == "moondream":
        try:
            pil_image = Image.open(io.BytesIO(raw_bytes))
            moondream_model = _get_moondream()
            moondream_encoded = moondream_model.encode_image(pil_image)
        except Exception as exc:
            print(f"[vision/{backend}] setup failed ({exc}) — keeping original coords")
            return hotspots
    else:
        data_url = _to_data_url(raw_bytes)

    results: list[dict[str, Any]] = []
    for h in hotspots:
        print(f"\n[vision/{backend}] '{h['title']}' (was x={h['x']}, y={h['y']})")
        try:
            if backend == "moondream":
                coords = _place_moondream(moondream_model, moondream_encoded, h)
            else:
                coords = _place_pixtral(data_url, artwork_title, artist_name, h)
        except Exception as exc:
            print(f"  error: {exc}")
            coords = None

        if coords:
            print(f"  → x={coords['x']}, y={coords['y']}")
            results.append({**h, **coords})
        else:
            print(f"  → keeping original x={h['x']}, y={h['y']}")
            results.append(h)

        if delay:
            time.sleep(delay)

    return results
