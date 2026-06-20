"""Helpers IIIF (Micrio, Image API 3.0).

On ne télécharge jamais le HD brut (jusqu'à ~14645 px) : le serveur IIIF rend
directement une taille demandée. `ref_url` sert à générer l'image de référence
ARKit (rendition légère) pour les seules œuvres trackées en démo.
"""

from __future__ import annotations

from typing import Optional

import requests

from .. import config, net


def hd_url(iiif_id: str) -> str:
    """URL d'affichage (taille max) — hotlink CDN, pas de réhébergement."""
    return f"{config.IIIF_BASE}/{iiif_id}/full/max/0/default.jpg"


def ref_url(iiif_id: str, width: int = config.ARKIT_REF_MAX_PX) -> str:
    """Rendition redimensionnée par le serveur IIIF (pour reference image ARKit)."""
    return f"{config.IIIF_BASE}/{iiif_id}/full/{width},/0/default.jpg"


def download(url: str, session: Optional[requests.Session] = None) -> Optional[bytes]:
    session = session or requests.Session()
    session.headers.update({"User-Agent": config.USER_AGENT})
    resp = net.polite_get(session, url, timeout=config.HTTP_TIMEOUT)
    if resp is None or not resp.ok:
        return None
    return resp.content
