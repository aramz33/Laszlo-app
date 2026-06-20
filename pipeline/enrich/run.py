"""Étape enrich : raw → data/enriched/{stem}.json (cache des appels réseau).

Idempotent : un objet déjà enrichi est sauté. Throttle léger entre objets.
"""

from __future__ import annotations

import json
import time
from typing import Optional

from .. import config
from ..rijks import edm, oai
from . import wikidata, wikipedia


def _enrich_one(object_number: str, wd_session, wp_session) -> dict:
    wd = wikidata.lookup(object_number, session=wd_session)
    wiki: dict[str, str] = {}
    if wd:
        for lang, title in (("en", wd["enwiki_title"]), ("nl", wd["nlwiki_title"])):
            if title:
                text = wikipedia.extract(lang, title, session=wp_session)
                if text:
                    wiki[lang] = text
    return {"object_number": object_number, "wikidata": wd, "wikipedia": wiki}


def run(limit: Optional[int] = None, throttle: float = 0.3) -> int:
    config.ensure_data_dirs()
    wd_session = wikidata._session()
    wp_session = wikipedia._session()

    done = 0
    for path in oai.iter_raw():
        if limit and done >= limit:
            break
        object_number = edm.parse_record(path).get("object_number") or path.stem
        out = config.DATA_ENRICHED / f"{path.stem}.json"
        if out.exists():
            done += 1
            continue

        result = _enrich_one(object_number, wd_session, wp_session)
        out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        done += 1

        wiki_langs = ",".join(result["wikipedia"].keys()) or "—"
        qid = result["wikidata"]["qid"] if result["wikidata"] else "no-qid"
        print(f"[enrich] {object_number:12} {qid:11} wiki={wiki_langs}")
        time.sleep(throttle)

    print(f"[enrich] terminé : {done} objets")
    return done
