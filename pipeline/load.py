"""Étape load : collections de modèles → Supabase (upsert idempotent) + Storage.

Résout les clés naturelles en FK, puis charge graphe → œuvres → notices/hotspots.
Les reference images AR ne sont générées/uploadées que pour les œuvres trackées.
"""

from __future__ import annotations

from typing import Iterable, Optional

from supabase import create_client

from . import config
from .hotspots import flagships
from .rijks import iiif


def _client():
    if not config.SUPABASE_URL or not config.SUPABASE_KEY:
        raise SystemExit(
            "SUPABASE_URL / SUPABASE_KEY manquants. Renseigne pipeline/.env "
            "(clé service_role) et exécute supabase/schema.sql d'abord."
        )
    return create_client(config.SUPABASE_URL, config.SUPABASE_KEY)


def _chunks(rows: list, size: int = 500) -> Iterable[list]:
    for i in range(0, len(rows), size):
        yield rows[i:i + size]


def _upsert(client, table: str, rows: list, on_conflict: str) -> list:
    out: list = []
    for chunk in _chunks(rows):
        res = client.table(table).upsert(chunk, on_conflict=on_conflict).execute()
        out.extend(res.data or [])
    return out


def _upload_ref_images(client, artworks: list, tracked: set[str]) -> dict[str, str]:
    urls: dict[str, str] = {}
    for art in artworks:
        if art.object_number not in tracked or not art.image_iiif_id:
            continue
        data = iiif.download(iiif.ref_url(art.image_iiif_id))
        if not data:
            continue
        path = f"ref/{art.object_number}.jpg"
        try:
            client.storage.from_(config.SUPABASE_BUCKET).upload(
                path, data,
                {"content-type": "image/jpeg", "upsert": "true"},
            )
            urls[art.object_number] = client.storage.from_(config.SUPABASE_BUCKET).get_public_url(path)
            print(f"[load] ref image uploadée : {art.object_number}")
        except Exception as exc:  # bucket absent, droits, etc. — ne bloque pas
            print(f"[load] upload ref {art.object_number} échoué : {exc}")
    return urls


def load(collections: dict, tracked: Optional[set[str]] = None) -> None:
    client = _client()
    tracked = tracked if tracked is not None else set(flagships.all_flagships())

    museum_id = {m["name"]: m["id"] for m in _upsert(
        client, "museum",
        [{"name": m.name, "city": m.city} for m in collections["museums"]],
        "name")}

    artist_id = {a["name"]: a["id"] for a in _upsert(
        client, "artist",
        [{"name": a.name, "birth_year": a.birth_year, "death_year": a.death_year,
          "wikidata_qid": a.wikidata_qid} for a in collections["artists"]],
        "name")}

    movement_id = {m["name"]: m["id"] for m in _upsert(
        client, "movement",
        [{"name": m.name, "wikidata_qid": m.wikidata_qid} for m in collections["movements"]],
        "name")}

    ref_urls = _upload_ref_images(client, collections["artworks"], tracked)

    artwork_rows = [{
        "object_number": a.object_number,
        "title_en": a.title_en, "title_nl": a.title_nl, "year": a.year,
        "height_cm": a.height_cm, "width_cm": a.width_cm,
        "image_iiif_id": a.image_iiif_id, "image_url": a.image_url,
        "ref_image_url": ref_urls.get(a.object_number),
        "artist_id": artist_id.get(a.artist_name),
        "movement_id": movement_id.get(a.movement_name),
        "museum_id": museum_id.get(a.museum_name),
        "rights": a.rights, "wikidata_qid": a.wikidata_qid,
        "tags": list(a.tags),
    } for a in collections["artworks"]]
    artwork_id = {a["object_number"]: a["id"] for a in
                  _upsert(client, "artwork", artwork_rows, "object_number")}

    notice_rows = [{
        "artwork_id": artwork_id[n.object_number],
        "lang": n.lang, "source": n.source, "text": n.text,
        "sources": list(n.sources), "groundedness": n.groundedness,
    } for n in collections["notices"] if n.object_number in artwork_id]
    _upsert(client, "notice", notice_rows, "artwork_id,lang,source")

    hotspot_rows = [{
        "artwork_id": artwork_id[h.object_number],
        "x": h.x, "y": h.y, "title": h.title, "aspect": h.aspect,
        "narration_text": h.narration_text, "audio_url": h.audio_url,
        "duration_s": h.duration_s, "ord": h.ord,
    } for h in collections["hotspots"] if h.object_number in artwork_id]
    _upsert(client, "hotspot", hotspot_rows, "artwork_id,ord")

    print(
        f"[load] {len(artwork_id)} œuvres · {len(artist_id)} artistes · "
        f"{len(movement_id)} mouvements · {len(notice_rows)} notices · "
        f"{len(hotspot_rows)} hotspots → Supabase"
    )
