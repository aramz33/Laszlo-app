"""Harvest OAI-PMH du Rijksmuseum → fichiers XML bruts par objet (couche raw).

Parser défensif : la version EDM a changé en juin 2026 (set renommé, envelope
susceptible de bouger). On isole chaque <record> et on le persiste tel quel ;
le parsing fin vit dans edm.py et tourne hors-ligne depuis data/raw/.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Iterator, Optional

import requests

from .. import config

OAI_NS = "{http://www.openarchives.org/OAI/2.0/}"
DC_NS = "{http://purl.org/dc/elements/1.1/}"

_UNSAFE = re.compile(r"[^A-Za-z0-9._-]+")


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": config.USER_AGENT})
    return s


def _safe_stem(record: ET.Element, header_id: str) -> str:
    """Nom de fichier = objectNumber (ex. SK-C-5) si trouvable, sinon id OAI."""
    for ident in record.iter(f"{DC_NS}identifier"):
        text = (ident.text or "").strip()
        if text and not text.startswith("http"):
            return _UNSAFE.sub("_", text)
    tail = header_id.rstrip("/").split("/")[-1]
    return _UNSAFE.sub("_", tail) or "unknown"


def _fetch(session: requests.Session, params: dict) -> str:
    resp = session.get(config.RIJKS_OAI_BASE, params=params, timeout=config.HTTP_TIMEOUT)
    resp.raise_for_status()
    return resp.text


def _resumption_token(root: ET.Element) -> Optional[str]:
    node = root.find(f".//{OAI_NS}resumptionToken")
    if node is None:
        return None
    token = (node.text or "").strip()
    return token or None


def harvest(set_spec: Optional[str] = None, limit: Optional[int] = None) -> int:
    """Télécharge le set et écrit data/raw/{stem}.xml. Retourne le nb d'objets écrits."""
    set_spec = set_spec or config.RIJKS_SET
    config.ensure_data_dirs()
    session = _session()

    params = {
        "verb": "ListRecords",
        "set": set_spec,
        "metadataPrefix": config.RIJKS_METADATA_PREFIX,
    }
    written = 0
    page = 0
    while True:
        page += 1
        try:
            xml_text = _fetch(session, params)
            root = ET.fromstring(xml_text)
        except (requests.RequestException, ET.ParseError) as exc:
            print(f"[harvest] page {page} échouée : {exc}")
            break

        error = root.find(f"{OAI_NS}error")
        if error is not None:
            print(f"[harvest] OAI error: {error.get('code')} — {error.text}")
            break

        for record in root.iter(f"{OAI_NS}record"):
            header = record.find(f"{OAI_NS}header")
            if header is not None and header.get("status") == "deleted":
                continue
            id_node = header.find(f"{OAI_NS}identifier") if header is not None else None
            header_id = (id_node.text or "").strip() if id_node is not None else ""
            stem = _safe_stem(record, header_id)
            out = config.DATA_RAW / f"{stem}.xml"
            out.write_text(ET.tostring(record, encoding="unicode"), encoding="utf-8")
            written += 1
            if limit and written >= limit:
                print(f"[harvest] limite {limit} atteinte ({written} objets)")
                return written

        print(f"[harvest] page {page} : {written} objets cumulés")
        token = _resumption_token(root)
        if not token:
            break
        params = {"verb": "ListRecords", "resumptionToken": token}

    print(f"[harvest] terminé : {written} objets dans {config.DATA_RAW}")
    return written


def iter_raw() -> Iterator[Path]:
    """Itère les fichiers XML bruts déjà téléchargés."""
    yield from sorted(config.DATA_RAW.glob("*.xml"))
