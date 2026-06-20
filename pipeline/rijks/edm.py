"""Parser EDM : un fichier <record> brut → dict normalisé (défensif).

Ne lève jamais sur un champ manquant ; un record incomplet renvoie ce qu'il a.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path

DC = "{http://purl.org/dc/elements/1.1/}"
DCTERMS = "{http://purl.org/dc/terms/}"
EDM = "{http://www.europeana.eu/schemas/edm/}"
RDF = "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}"
XML = "{http://www.w3.org/XML/1998/namespace}"
OAI = "{http://www.openarchives.org/OAI/2.0/}"

_IIIF_ID = re.compile(r"iiif\.micr\.io/([^/\"]+)")
_YEAR = re.compile(r"(\d{4})")


def _texts_by_lang(root: ET.Element, tag: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for node in root.iter(tag):
        text = (node.text or "").strip()
        if not text:
            continue
        lang = node.get(f"{XML}lang", "und")
        out.setdefault(lang, []).append(text)
    return out


def _longest_per_lang(by_lang: dict[str, list[str]]) -> dict[str, str]:
    return {lang: max(values, key=len) for lang, values in by_lang.items()}


def _first_resource(root: ET.Element, tag: str) -> str | None:
    for node in root.iter(tag):
        res = node.get(f"{RDF}resource")
        if res:
            return res
    return None


def _iiif_id(root: ET.Element) -> str | None:
    for tag in (f"{EDM}isShownBy", f"{EDM}object"):
        res = _first_resource(root, tag)
        if res:
            m = _IIIF_ID.search(res)
            if m:
                return m.group(1)
    # filet : chercher dans tout le XML sérialisé
    m = _IIIF_ID.search(ET.tostring(root, encoding="unicode"))
    return m.group(1) if m else None


def _object_number(root: ET.Element) -> str | None:
    for node in root.iter(f"{DC}identifier"):
        text = (node.text or "").strip()
        if text and not text.startswith("http"):
            return text
    return None


def _provided_cho_uri(root: ET.Element) -> str | None:
    for node in root.iter(f"{EDM}ProvidedCHO"):
        about = node.get(f"{RDF}about")
        if about:
            return about
    header = root.find(f"{OAI}header/{OAI}identifier")
    return header.text.strip() if header is not None and header.text else None


def _year(root: ET.Element) -> int | None:
    for tag in (f"{DC}date", f"{DCTERMS}created", f"{EDM}year"):
        for node in root.iter(tag):
            m = _YEAR.search(node.text or "")
            if m:
                return int(m.group(1))
    return None


def parse_record(path: Path) -> dict:
    record = ET.fromstring(path.read_text(encoding="utf-8"))

    titles = _longest_per_lang(_texts_by_lang(record, f"{DC}title"))
    descriptions = _longest_per_lang(_texts_by_lang(record, f"{DC}description"))
    extent = _texts_by_lang(record, f"{DCTERMS}extent")
    extent_en = (extent.get("en") or extent.get("nl") or [None])[0]

    return {
        "object_number": _object_number(record),
        "uri": _provided_cho_uri(record),
        "title_en": titles.get("en"),
        "title_nl": titles.get("nl"),
        "desc_en": descriptions.get("en"),
        "desc_nl": descriptions.get("nl"),
        "creator_uri": _first_resource(record, f"{DC}creator"),
        "year": _year(record),
        "extent": extent_en,
        "rights": _first_resource(record, f"{EDM}rights"),
        "iiif_id": _iiif_id(record),
    }
