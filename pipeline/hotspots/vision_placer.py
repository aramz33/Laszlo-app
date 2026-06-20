"""Placement automatique des hotspots par modèle de vision (Pixtral via Scaleway).

Pour chaque hotspot (titre + aspect), envoie l'image de l'œuvre au modèle
et lui demande de retourner les coordonnées [0,1] du centre de l'élément
décrit. Fallback sur les coords existantes si l'appel échoue.

L'image est réduite via le paramètre de taille IIIF avant envoi (évite de
transférer la Night Watch à 14k px).
"""

from __future__ import annotations

import base64
import json
import re
import time
from typing import Any

import requests

from .. import config

# Maximum pixel dimension sent to the vision model (IIIF resize).
_IIIF_MAX_PX = 1024


def _iiif_resized(image_url: str) -> str:
    """Replace the IIIF size segment to cap the longest dimension."""
    # https://iiif.micr.io/PJEZO/full/max/0/default.jpg
    #              → .../full/!1024,1024/0/default.jpg
    return re.sub(r"/full/[^/]+/", f"/full/!{_IIIF_MAX_PX},{_IIIF_MAX_PX}/", image_url)


def _to_data_url(image_url: str) -> str:
    resp = requests.get(image_url, timeout=30)
    resp.raise_for_status()
    mime = resp.headers.get("Content-Type", "image/jpeg").split(";")[0]
    return f"data:{mime};base64,{base64.b64encode(resp.content).decode()}"


def _make_prompt(artwork_title: str, artist_name: str,
                 hotspot_title: str, aspect: str) -> str:
    return (
        f'You are analyzing the painting "{artwork_title}" by {artist_name}.\n\n'
        f'Locate the following detail and return the position of its CENTER.\n\n'
        f'Detail: "{hotspot_title}" ({aspect})\n\n'
        "Reply with ONLY a JSON object on a single line — no other text:\n"
        '{"x": <float 0.0–1.0>, "y": <float 0.0–1.0>}\n\n'
        "x=0 is the LEFT edge, x=1 is the RIGHT edge. "
        "y=0 is the TOP edge, y=1 is the BOTTOM edge."
    )


def _call_vision(data_url: str, prompt: str) -> dict[str, float] | None:
    """POST to Pixtral; parse {x, y} from the reply. Returns None on failure."""
    if not config.SCW_BASE_URL or not config.SCW_API_KEY:
        raise RuntimeError("SCW_BASE_URL / SCW_API_KEY not set in .env")

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
    content = resp.json()["choices"][0]["message"]["content"].strip()

    # Extract the first JSON object even if the model adds surrounding text.
    match = re.search(r'\{[^{}]+\}', content)
    if not match:
        print(f"  [vision] no JSON in reply: {content!r}")
        return None
    try:
        coords = json.loads(match.group())
        x = float(coords["x"])
        y = float(coords["y"])
        return {"x": round(max(0.0, min(1.0, x)), 3),
                "y": round(max(0.0, min(1.0, y)), 3)}
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        print(f"  [vision] parse error ({exc}): {match.group()!r}")
        return None


def place(
    artwork_title: str,
    artist_name: str,
    image_url: str,
    hotspots: list[dict[str, Any]],
    delay: float = 1.5,
) -> list[dict[str, Any]]:
    """
    For each hotspot dict (keys: title, aspect, x, y, + any others),
    call the vision model to replace x/y. Falls back to originals on error.

    Returns a new list with updated dicts.
    """
    resized = _iiif_resized(image_url)
    print(f"[vision] downloading image: {resized}")
    try:
        data_url = _to_data_url(resized)
    except Exception as exc:
        print(f"[vision] image download failed ({exc}) — keeping original coords")
        return hotspots

    results: list[dict[str, Any]] = []
    for h in hotspots:
        prompt = _make_prompt(artwork_title, artist_name, h["title"], h["aspect"])
        print(f"[vision] locating '{h['title']}' (was x={h['x']}, y={h['y']})")
        coords = _call_vision(data_url, prompt)
        if coords:
            print(f"         → x={coords['x']}, y={coords['y']}")
            results.append({**h, **coords})
        else:
            print(f"         → keeping original x={h['x']}, y={h['y']}")
            results.append(h)
        if delay:
            time.sleep(delay)

    return results
