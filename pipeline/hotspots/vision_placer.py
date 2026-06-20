"""Placement automatique des hotspots par modèle de vision.

Trois backends sélectionnables via --backend :

  moondream    — Moondream-2b en local (recommandé). Modèle open-source conçu
                 pour la tâche « point to X » : retourne directement des
                 coordonnées (x, y). Télécharge ~1.7 GB au premier lancement.

  pixtral-grid — Pixtral via Scaleway (crédits existants). Approche grille 5×5 :
                 on demande une case nommée (ex. "C3") plutôt que des floats —
                 beaucoup plus fiable pour un LLM. Résolution ±0.1.

  pixtral      — Pixtral floats directs (legacy, peu fiable, gardé pour comparaison).

Usage depuis main.py :
    python -m pipeline.main place-hotspots --backend moondream
    python -m pipeline.main place-hotspots --backend pixtral-grid
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

BACKENDS = ("moondream", "pixtral-grid", "pixtral")

# IIIF resize cap — avoid sending the Night Watch at 14k px to the model.
_IIIF_MAX_PX = 1024


# ---------------------------------------------------------------------------
# Shared image utilities
# ---------------------------------------------------------------------------

def _iiif_resized(image_url: str) -> str:
    """Replace the IIIF size segment to cap the longest dimension."""
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

# Moondream is loaded lazily and cached — the 1.7 GB model takes ~10 s to load.
_moondream_model = None


def _get_moondream():
    global _moondream_model
    if _moondream_model is None:
        try:
            import moondream as md
        except ImportError:
            raise RuntimeError(
                "moondream not installed — run: pip install moondream"
            )
        print("[moondream] loading model (first run downloads ~1.7 GB)…")
        _moondream_model = md.vl(model="moondream-2b")
        print("[moondream] model ready.")
    return _moondream_model


def _moondream_query(h: dict) -> str:
    """Build a descriptive query from the hotspot title + narration seed."""
    narration = (h.get("narration_text") or "").strip()
    # Keep it short — Moondream works best with concise queries.
    if narration:
        # First sentence of the narration is usually the most visual.
        first_sentence = re.split(r"[.!?]", narration)[0].strip()
        return f"{h['title']} — {first_sentence}"
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
# Backend: Pixtral-grid (5×5 named grid — much more reliable than raw floats)
# ---------------------------------------------------------------------------

# Grid: columns A–E (x) × rows 1–5 (y), each cell center at (col+0.5)/5.
_GRID_COLS = list("ABCDE")   # index 0–4 → x centers 0.1, 0.3, 0.5, 0.7, 0.9
_GRID_ROWS = [1, 2, 3, 4, 5] # index 0–4 → y centers 0.1, 0.3, 0.5, 0.7, 0.9

_VALID_CELLS = {
    f"{c}{r}" for c in _GRID_COLS for r in _GRID_ROWS
}


def _grid_to_xy(cell: str) -> dict[str, float] | None:
    """Convert a grid cell label (e.g. "C3") to normalised (x, y)."""
    cell = cell.strip().upper()
    if len(cell) != 2 or cell not in _VALID_CELLS:
        return None
    col_idx = _GRID_COLS.index(cell[0])
    row_idx = int(cell[1]) - 1
    return {
        "x": _clamp((col_idx + 0.5) / 5),
        "y": _clamp((row_idx + 0.5) / 5),
    }


def _pixtral_grid_prompt(artwork_title: str, artist_name: str, h: dict) -> str:
    narration = (h.get("narration_text") or "").strip()
    desc_line = f"\nDescription: {narration}" if narration else ""
    grid_visual = (
        "     A      B      C      D      E\n"
        "  +------+------+------+------+------+\n"
        "1 | 0.1  | 0.3  | 0.5  | 0.7  | 0.9  |  ← y=0.1  (top)\n"
        "  +------+------+------+------+------+\n"
        "2 | 0.1  | 0.3  | 0.5  | 0.7  | 0.9  |  ← y=0.3\n"
        "  +------+------+------+------+------+\n"
        "3 | 0.1  | 0.3  | 0.5  | 0.7  | 0.9  |  ← y=0.5  (center)\n"
        "  +------+------+------+------+------+\n"
        "4 | 0.1  | 0.3  | 0.5  | 0.7  | 0.9  |  ← y=0.7\n"
        "  +------+------+------+------+------+\n"
        "5 | 0.1  | 0.3  | 0.5  | 0.7  | 0.9  |  ← y=0.9  (bottom)\n"
        "  +------+------+------+------+------+\n"
        "    x=0.1  x=0.3  x=0.5  x=0.7  x=0.9\n"
        "    left                          right"
    )
    return (
        f'You are analyzing the painting "{artwork_title}" by {artist_name}.\n\n'
        f"The image is divided into a 5×5 grid:\n{grid_visual}\n\n"
        f'Locate the CENTER of this detail: "{h["title"]}" ({h["aspect"]})'
        f"{desc_line}\n\n"
        "Reply with ONLY the grid cell label, e.g. C3. No other text."
    )


def _place_pixtral_grid(
    data_url: str, artwork_title: str, artist_name: str, h: dict
) -> dict[str, float] | None:
    if not config.SCW_BASE_URL or not config.SCW_API_KEY:
        raise RuntimeError("SCW_BASE_URL / SCW_API_KEY not set")

    prompt = _pixtral_grid_prompt(artwork_title, artist_name, h)
    resp = requests.post(
        f"{config.SCW_BASE_URL}/chat/completions",
        json={
            "model": config.SCW_VISION_MODEL,
            "temperature": 0,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt},
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

    # Accept the cell anywhere in the reply (model sometimes adds a sentence).
    match = re.search(r'\b([A-Ea-e][1-5])\b', raw)
    if not match:
        print(f"  [pixtral-grid] no valid cell in reply: {raw!r}")
        return None
    cell = match.group(1).upper()
    coords = _grid_to_xy(cell)
    if coords is None:
        print(f"  [pixtral-grid] invalid cell: {cell!r}")
    return coords


# ---------------------------------------------------------------------------
# Backend: Pixtral direct floats (legacy — kept for comparison baseline)
# ---------------------------------------------------------------------------

def _pixtral_direct_prompt(artwork_title: str, artist_name: str, h: dict) -> str:
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


def _place_pixtral_direct(
    data_url: str, artwork_title: str, artist_name: str, h: dict
) -> dict[str, float] | None:
    if not config.SCW_BASE_URL or not config.SCW_API_KEY:
        raise RuntimeError("SCW_BASE_URL / SCW_API_KEY not set")

    prompt = _pixtral_direct_prompt(artwork_title, artist_name, h)
    resp = requests.post(
        f"{config.SCW_BASE_URL}/chat/completions",
        json={
            "model": config.SCW_VISION_MODEL,
            "temperature": 0,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt},
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
        print(f"  [pixtral] no JSON in reply")
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

    backend: "moondream" | "pixtral-grid" | "pixtral"
    """
    if backend not in BACKENDS:
        raise ValueError(f"backend must be one of {BACKENDS}")

    resized_url = _iiif_resized(image_url)

    # Moondream works with PIL images; Pixtral backends need a data URL.
    moondream_model = None
    moondream_encoded = None
    data_url = None

    if backend == "moondream":
        print(f"[vision/{backend}] downloading image: {resized_url}")
        try:
            raw = _download_bytes(resized_url)
            pil_image = Image.open(io.BytesIO(raw))
            moondream_model = _get_moondream()
            moondream_encoded = moondream_model.encode_image(pil_image)
        except Exception as exc:
            print(f"[vision/{backend}] setup failed ({exc}) — keeping original coords")
            return hotspots
    else:
        print(f"[vision/{backend}] downloading image: {resized_url}")
        try:
            raw = _download_bytes(resized_url)
            data_url = _to_data_url(raw)
        except Exception as exc:
            print(f"[vision/{backend}] image download failed ({exc}) — keeping original coords")
            return hotspots

    results: list[dict[str, Any]] = []
    for h in hotspots:
        print(f"\n[vision/{backend}] '{h['title']}' (was x={h['x']}, y={h['y']})")
        try:
            if backend == "moondream":
                coords = _place_moondream(moondream_model, moondream_encoded, h)
            elif backend == "pixtral-grid":
                coords = _place_pixtral_grid(data_url, artwork_title, artist_name, h)
            else:
                coords = _place_pixtral_direct(data_url, artwork_title, artist_name, h)
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
