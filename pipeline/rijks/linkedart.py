"""Résolution d'une URI créateur Rijks → nom + dates (Linked Art JSON).

Cache mémoire : plusieurs œuvres partagent le même artiste.
"""

from __future__ import annotations

import re
from typing import Optional

import requests

from .. import config, net

_YEAR = re.compile(r"(\d{4})")
_cache: dict[str, Optional[dict]] = {}


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": config.USER_AGENT, "Accept": "application/ld+json"})
    return s


def _display_name(identified_by: list) -> Optional[str]:
    names = [n.get("content") for n in identified_by if n.get("type") == "Name" and n.get("content")]
    if not names:
        return None
    # préférer un nom en ordre naturel (sans virgule d'inversion "Rijn, Rembrandt van")
    natural = [n for n in names if "," not in n]
    return (natural or names)[0]


def _year_of(event: Optional[dict], key: str) -> Optional[int]:
    if not event:
        return None
    timespan = event.get("timespan") or {}
    value = timespan.get(key) or ""
    m = _YEAR.search(value)
    return int(m.group(1)) if m else None


def resolve(uri: Optional[str], session: Optional[requests.Session] = None) -> Optional[dict]:
    if not uri:
        return None
    if uri in _cache:
        return _cache[uri]

    session = session or _session()
    resp = net.polite_get(session, uri, timeout=config.HTTP_TIMEOUT)
    if resp is None or not resp.ok:
        _cache[uri] = None
        return None
    try:
        data = resp.json()
    except ValueError:
        _cache[uri] = None
        return None

    result = {
        "name": _display_name(data.get("identified_by") or []),
        "birth_year": _year_of(data.get("born"), "begin_of_the_begin"),
        "death_year": _year_of(data.get("died"), "end_of_the_end"),
        "wikidata_qid": None,
    }
    _cache[uri] = result
    return result
