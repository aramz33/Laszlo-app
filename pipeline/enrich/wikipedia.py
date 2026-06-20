"""Récupère le texte narratif d'un article Wikipedia (substrat de notice).

Source citée, stockée brute (sans LLM). N'est appelé que si Wikidata a fourni un
titre d'article pour la langue (gate). Renvoie None si absent.
"""

from __future__ import annotations

from typing import Optional

import requests

from .. import config, net

_API = "https://{lang}.wikipedia.org/w/api.php"


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": config.USER_AGENT})
    return s


def extract(lang: str, title: str, session: Optional[requests.Session] = None) -> Optional[str]:
    """Texte brut de l'article (intro + corps) via l'action API extracts."""
    session = session or _session()
    params = {
        "action": "query",
        "format": "json",
        "prop": "extracts",
        "explaintext": "1",
        "redirects": "1",
        "titles": title,
    }
    resp = net.polite_get(
        session, _API.format(lang=lang), params=params, timeout=config.HTTP_TIMEOUT
    )
    if resp is None or not resp.ok:
        print(f"[wikipedia] {lang}:{title} : pas de réponse exploitable")
        return None
    try:
        pages = resp.json()["query"]["pages"]
    except (ValueError, KeyError) as exc:
        print(f"[wikipedia] {lang}:{title} : {exc}")
        return None

    for page in pages.values():
        text = (page.get("extract") or "").strip()
        if text:
            return text
    return None
