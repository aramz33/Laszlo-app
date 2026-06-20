"""HTTP poli : throttle léger + retry/backoff sur 429 et 5xx transitoires.

Indispensable pour parcourir 747 objets sans se faire jeter par Wikidata/Wikipedia.
"""

from __future__ import annotations

import time

import requests

RETRY_STATUS = {429, 500, 502, 503, 504}


def polite_get(
    session: requests.Session,
    url: str,
    *,
    params: dict | None = None,
    timeout: int = 60,
    max_retries: int = 5,
    base_delay: float = 1.0,
) -> requests.Response | None:
    """GET avec backoff exponentiel ; honore Retry-After. None si échec définitif."""
    for attempt in range(max_retries):
        try:
            resp = session.get(url, params=params, timeout=timeout)
        except requests.RequestException as exc:
            wait = base_delay * (2 ** attempt)
            print(f"[net] {exc} → retry dans {wait:.0f}s")
            time.sleep(wait)
            continue

        if resp.status_code in RETRY_STATUS:
            retry_after = resp.headers.get("Retry-After")
            wait = float(retry_after) if retry_after and retry_after.isdigit() else base_delay * (2 ** attempt)
            print(f"[net] {resp.status_code} sur {url.split('//')[-1][:40]} → retry dans {wait:.0f}s")
            time.sleep(wait)
            continue

        return resp

    return None
