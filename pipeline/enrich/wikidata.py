"""Pont Wikidata : n° d'inventaire Rijks → Q-id + faits structurés + sitelinks.

Marche pour toutes les œuvres (Q-id via P217+P195). L'article Wikipedia n'existe
que pour les célèbres → `enwiki`/`nlwiki` peut être absent (c'est le gate).
"""

from __future__ import annotations

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


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": config.USER_AGENT, "Accept": "application/sparql-results+json"})
    return s


def _wiki_title(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    m = _WIKI_TITLE.search(url)
    return m.group(1) if m else None


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
