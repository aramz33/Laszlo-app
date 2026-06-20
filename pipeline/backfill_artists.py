"""Backfill artiste Wikidata QIDs dans data/refined/*.json."""

from __future__ import annotations

import json
from typing import Optional

from . import config
from .enrich import wikidata


def run(limit: Optional[int] = None) -> int:
    config.ensure_data_dirs()
    paths = sorted(config.DATA_REFINED.glob("*.json"))
    if limit:
        paths = paths[:limit]

    session = wikidata._session()
    cache: dict[tuple[str, Optional[int], Optional[int]], Optional[str]] = {}
    updated = 0

    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        artist = data.get("artist") or {}
        name = artist.get("name")
        if not name or artist.get("wikidata_qid"):
            continue

        key = (name, artist.get("birth_year"), artist.get("death_year"))
        if key not in cache:
            cache[key] = wikidata.lookup_artist_qid(*key, session=session)

        if cache[key]:
            artist["wikidata_qid"] = cache[key]
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            updated += 1

    print(f"[artist-qids] {updated} fichiers raffinés mis à jour · {len(cache)} artistes cherchés")
    return updated
