"""Étape refine : raw + enriched → data/refined/{stem}.json (prêt pour transform).

Parse les dimensions, résout l'artiste, fusionne l'enrichissement, filtre
(image IIIF + CC0). Idempotent : un objet déjà raffiné est sauté (offline-friendly).
"""

from __future__ import annotations

import json
import re
from typing import Optional

from . import config
from .rijks import edm, iiif, linkedart, oai

_DIM = {
    "height": re.compile(r"height\s+([\d.,]+)\s*cm"),
    "width": re.compile(r"width\s+([\d.,]+)\s*cm"),
}


def _dimension(extent: Optional[str], which: str) -> Optional[float]:
    if not extent:
        return None
    m = _DIM[which].search(extent)
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", "."))
    except ValueError:
        return None


def _is_cc0(rights: Optional[str]) -> bool:
    return bool(rights and "publicdomain" in rights)


def _load_enriched(stem: str) -> dict:
    path = config.DATA_ENRICHED / f"{stem}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"wikidata": None, "wikipedia": {}}


def _wiki_display_title(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    title = re.sub(r"\s*\([^)]*\)$", "", value.replace("_", " ")).strip()
    return title or None


def _title(rec: dict, wd: dict, lang: str) -> Optional[str]:
    return _wiki_display_title(wd.get(f"{lang}wiki_title")) or rec.get(f"title_{lang}")


def _refine_one(path, creator_session) -> Optional[dict]:
    rec = edm.parse_record(path)
    if not rec.get("iiif_id") or not _is_cc0(rec.get("rights")):
        return None

    enriched = _load_enriched(path.stem)
    wd = enriched.get("wikidata") or {}
    artist = linkedart.resolve(rec.get("creator_uri"), session=creator_session)

    return {
        "object_number": rec["object_number"],
        "uri": rec["uri"],
        "title_en": _title(rec, wd, "en"),
        "title_nl": _title(rec, wd, "nl"),
        "year": rec["year"],
        "height_cm": _dimension(rec.get("extent"), "height"),
        "width_cm": _dimension(rec.get("extent"), "width"),
        "iiif_id": rec["iiif_id"],
        "image_url": iiif.hd_url(rec["iiif_id"]),
        "rights": rec["rights"],
        "wikidata_qid": wd.get("qid"),
        "movement": wd.get("movement"),
        "tags": list(wd.get("tags") or []),
        "artist": artist,
        "desc_en": rec["desc_en"],
        "desc_nl": rec["desc_nl"],
        "wikipedia": enriched.get("wikipedia") or {},
    }


def run(limit: Optional[int] = None) -> int:
    config.ensure_data_dirs()
    creator_session = linkedart._session()
    kept = skipped = 0
    for path in oai.iter_raw():
        if limit and kept >= limit:
            break
        out = config.DATA_REFINED / f"{path.stem}.json"
        if out.exists():
            kept += 1
            continue
        refined = _refine_one(path, creator_session)
        if refined is None:
            skipped += 1
            continue
        out.write_text(json.dumps(refined, ensure_ascii=False, indent=2), encoding="utf-8")
        kept += 1

    print(f"[refine] {kept} raffinés, {skipped} écartés (pas d'image / non CC0)")
    return kept
