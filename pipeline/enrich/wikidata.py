"""Pont Wikidata : n° d'inventaire Rijks → Q-id + faits structurés + sitelinks.

Marche pour toutes les œuvres (Q-id via P217+P195). L'article Wikipedia n'existe
que pour les célèbres → `enwiki`/`nlwiki` peut être absent (c'est le gate).
"""

from __future__ import annotations

import json
import re
from typing import Optional

import requests

from .. import config, net

_WIKI_TITLE = re.compile(r"/wiki/(.+)$")

_QUERY = """
SELECT ?item ?movementLabel ?enwiki ?nlwiki
  (GROUP_CONCAT(DISTINCT ?tag; separator="|") AS ?tags)
WHERE {{
  ?item wdt:P217 "{inv}" ; wdt:P195 wd:{collection} .
  OPTIONAL {{ ?item wdt:P135 ?mv . ?mv rdfs:label ?movementLabel . FILTER(LANG(?movementLabel)="en") }}
  OPTIONAL {{
    {{ ?item wdt:P180 ?t . }} UNION {{ ?item wdt:P136 ?t . }}
    ?t rdfs:label ?tag . FILTER(LANG(?tag)="en")
  }}
  OPTIONAL {{ ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }}
  OPTIONAL {{ ?nlwiki schema:about ?item ; schema:isPartOf <https://nl.wikipedia.org/> . }}
}}
GROUP BY ?item ?movementLabel ?enwiki ?nlwiki
"""

_ARTIST_QUERY = """
SELECT ?artist ?birthYear ?deathYear WHERE {{
  ?artist wdt:P31 wd:Q5 .
  {{
    ?artist rdfs:label {name_en} .
  }} UNION {{
    ?artist rdfs:label {name_nl} .
  }} UNION {{
    ?artist skos:altLabel {name_en} .
  }} UNION {{
    ?artist skos:altLabel {name_nl} .
  }}
  OPTIONAL {{ ?artist wdt:P569 ?birth . BIND(YEAR(?birth) AS ?birthYear) }}
  OPTIONAL {{ ?artist wdt:P570 ?death . BIND(YEAR(?death) AS ?deathYear) }}
}}
LIMIT 10
"""


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": config.USER_AGENT, "Accept": "application/sparql-results+json"})
    return s


def _wiki_title(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    m = _WIKI_TITLE.search(url)
    return m.group(1) if m else None


def _int_value(row: dict, key: str) -> Optional[int]:
    value = row.get(key, {}).get("value")
    try:
        return int(value) if value is not None else None
    except ValueError:
        return None


def _select_artist_qid(rows: list[dict], birth_year: Optional[int], death_year: Optional[int]) -> Optional[str]:
    candidates = []
    for row in rows:
        qid = row.get("artist", {}).get("value", "").rsplit("/", 1)[-1]
        if qid:
            candidates.append((qid, _int_value(row, "birthYear"), _int_value(row, "deathYear")))

    if birth_year or death_year:
        for qid, birth, death in candidates:
            birth_ok = birth_year is None or birth == birth_year
            death_ok = death_year is None or death == death_year
            if birth_ok and death_ok:
                return qid
        return None

    qids = {qid for qid, _, _ in candidates}
    return next(iter(qids)) if len(qids) == 1 else None


def lookup(object_number: str, session: Optional[requests.Session] = None) -> Optional[dict]:
    """Retourne {qid, movement, tags, enwiki_title, nlwiki_title} ou None si absent."""
    session = session or _session()
    query = _QUERY.format(inv=object_number, collection=config.RIJKS_COLLECTION_QID)
    resp = net.polite_get(
        session, config.WIKIDATA_SPARQL, params={"query": query}, timeout=config.HTTP_TIMEOUT
    )
    if resp is None or not resp.ok:
        print(f"[wikidata] {object_number} : pas de réponse exploitable")
        return None
    try:
        rows = resp.json()["results"]["bindings"]
    except (ValueError, KeyError) as exc:
        print(f"[wikidata] {object_number} : {exc}")
        return None

    if not rows:
        return None

    row = rows[0]
    tags_raw = row.get("tags", {}).get("value", "")
    return {
        "qid": row["item"]["value"].rsplit("/", 1)[-1],
        "movement": row.get("movementLabel", {}).get("value") or None,
        "tags": tuple(t for t in tags_raw.split("|") if t),
        "enwiki_title": _wiki_title(row.get("enwiki", {}).get("value")),
        "nlwiki_title": _wiki_title(row.get("nlwiki", {}).get("value")),
    }


def lookup_artist_qid(
    name: str,
    birth_year: Optional[int] = None,
    death_year: Optional[int] = None,
    session: Optional[requests.Session] = None,
) -> Optional[str]:
    """Retourne le Q-id artiste si le label et les dates donnent un match net."""
    if not name or name.lower() in {"anon", "anonymous", "unknown"}:
        return None
    if birth_year is None and death_year is None:
        return None

    session = session or _session()
    literal = json.dumps(name, ensure_ascii=False)
    query = _ARTIST_QUERY.format(name_en=f"{literal}@en", name_nl=f"{literal}@nl")
    resp = net.polite_get(
        session, config.WIKIDATA_SPARQL, params={"query": query}, timeout=config.HTTP_TIMEOUT
    )
    if resp is None or not resp.ok:
        print(f"[wikidata] artiste {name!r} : pas de réponse exploitable")
        return None

    try:
        rows = resp.json()["results"]["bindings"]
    except (ValueError, KeyError) as exc:
        print(f"[wikidata] artiste {name!r} : {exc}")
        return None

    return _select_artist_qid(rows, birth_year, death_year)


def _self_check() -> None:
    rows = [
        {
            "artist": {"value": "http://www.wikidata.org/entity/Q5598"},
            "birthYear": {"value": "1606"},
            "deathYear": {"value": "1669"},
        },
        {
            "artist": {"value": "http://www.wikidata.org/entity/Q1"},
            "birthYear": {"value": "1600"},
            "deathYear": {"value": "1660"},
        },
    ]
    assert _select_artist_qid(rows, 1606, 1669) == "Q5598"
    assert _select_artist_qid(rows, 1632, 1675) is None


if __name__ == "__main__":
    _self_check()
