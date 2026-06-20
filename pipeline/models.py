"""Modèles immuables = contrat de la couche Connaissance (cf. supabase/schema.sql).

Les relations utilisent des clés naturelles (object_number, nom) ; `load.py` les
résout en clés étrangères Supabase à l'upsert.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class Artist:
    name: str
    birth_year: Optional[int] = None
    death_year: Optional[int] = None
    wikidata_qid: Optional[str] = None


@dataclass(frozen=True)
class Movement:
    name: str
    wikidata_qid: Optional[str] = None


@dataclass(frozen=True)
class Museum:
    name: str
    city: Optional[str] = None


@dataclass(frozen=True)
class Artwork:
    object_number: str
    title_en: Optional[str] = None
    title_nl: Optional[str] = None
    year: Optional[int] = None
    height_cm: Optional[float] = None
    width_cm: Optional[float] = None
    image_iiif_id: Optional[str] = None
    image_url: Optional[str] = None
    ref_image_url: Optional[str] = None
    artist_name: Optional[str] = None
    movement_name: Optional[str] = None
    museum_name: Optional[str] = None
    rights: Optional[str] = None
    wikidata_qid: Optional[str] = None
    tags: tuple[str, ...] = ()


@dataclass(frozen=True)
class Notice:
    object_number: str
    lang: str
    source: str  # rijks | wikipedia
    text: str
    sources: tuple[dict, ...] = ()
    groundedness: str = "review"  # ok | review


@dataclass(frozen=True)
class Hotspot:
    object_number: str
    x: float
    y: float
    title: str
    aspect: str
    narration_text: str
    ord: int
    audio_url: Optional[str] = None
    duration_s: Optional[float] = None
