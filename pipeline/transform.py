"""Étape transform : data/refined/*.json → collections de modèles (graphe + notices + hotspots).

Construit le graphe dédupliqué, les notices (1 ligne par source : rijks → ok,
wikipedia → review) et attache les hotspots des phares. Sortie consommée par load.
"""

from __future__ import annotations

import json
from typing import Optional

from . import config
from .hotspots import flagships
from .models import Artist, Artwork, Hotspot, Movement, Museum, Notice

MUSEUM = Museum(name="Rijksmuseum", city="Amsterdam")


def _notices_for(refined: dict) -> list[Notice]:
    obj = refined["object_number"]
    out: list[Notice] = []

    for lang in ("en", "nl"):
        text = (refined.get(f"desc_{lang}") or "").strip()
        if text:
            out.append(Notice(
                object_number=obj, lang=lang, source="rijks", text=text,
                sources=({"provider": "rijksmuseum", "uri": refined.get("uri")},),
                groundedness="ok",
            ))

    for lang, text in (refined.get("wikipedia") or {}).items():
        if text and text.strip():
            out.append(Notice(
                object_number=obj, lang=lang, source="wikipedia", text=text.strip(),
                sources=({"provider": "wikipedia", "lang": lang,
                          "wikidata_qid": refined.get("wikidata_qid")},),
                groundedness="review",
            ))
    return out


def build(limit: Optional[int] = None) -> dict:
    artists: dict[str, Artist] = {}
    movements: dict[str, Movement] = {}
    artworks: list[Artwork] = []
    notices: list[Notice] = []
    hotspots: list[Hotspot] = []

    paths = sorted(config.DATA_REFINED.glob("*.json"))
    if limit:
        paths = paths[:limit]

    for path in paths:
        refined = json.loads(path.read_text(encoding="utf-8"))

        artist = refined.get("artist")
        artist_name = artist.get("name") if artist else None
        if artist_name and artist_name not in artists:
            artists[artist_name] = Artist(
                name=artist_name,
                birth_year=artist.get("birth_year"),
                death_year=artist.get("death_year"),
                wikidata_qid=artist.get("wikidata_qid"),
            )

        movement_name = refined.get("movement")
        if movement_name and movement_name not in movements:
            movements[movement_name] = Movement(name=movement_name)

        artworks.append(Artwork(
            object_number=refined["object_number"],
            title_en=refined.get("title_en"),
            title_nl=refined.get("title_nl"),
            year=refined.get("year"),
            height_cm=refined.get("height_cm"),
            width_cm=refined.get("width_cm"),
            image_iiif_id=refined.get("iiif_id"),
            image_url=refined.get("image_url"),
            ref_image_url=None,  # rempli au load pour les œuvres trackées
            artist_name=artist_name,
            movement_name=movement_name,
            museum_name=MUSEUM.name,
            rights=refined.get("rights"),
            wikidata_qid=refined.get("wikidata_qid"),
            tags=tuple(refined.get("tags") or ()),
        ))

        notices.extend(_notices_for(refined))
        hotspots.extend(flagships.get(refined["object_number"]))

    result = {
        "museums": [MUSEUM],
        "artists": list(artists.values()),
        "movements": list(movements.values()),
        "artworks": artworks,
        "notices": notices,
        "hotspots": hotspots,
    }
    print(
        f"[transform] {len(artworks)} œuvres · {len(artists)} artistes · "
        f"{len(movements)} mouvements · {len(notices)} notices · {len(hotspots)} hotspots"
    )
    return result
