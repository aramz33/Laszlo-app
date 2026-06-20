"""Constantes et configuration du pipeline, chargées depuis l'environnement."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_RAW = PROJECT_ROOT / "data" / "raw"
DATA_ENRICHED = PROJECT_ROOT / "data" / "enriched"
DATA_REFINED = PROJECT_ROOT / "data" / "refined"
DATA_IMAGES = PROJECT_ROOT / "data" / "images"

RIJKS_OAI_BASE = os.environ.get("RIJKS_OAI_BASE", "https://data.rijksmuseum.nl/oai")
RIJKS_SET = os.environ.get("RIJKS_SET", "260214")  # Rijks Top 1000 (inclut les phares)
RIJKS_METADATA_PREFIX = "edm"

IIIF_BASE = "https://iiif.micr.io"

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
RIJKS_COLLECTION_QID = "Q190804"  # collection Rijksmuseum (propriété P195)

WIKIPEDIA_REST = "https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "artworks")

CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "contact@example.com")
USER_AGENT = f"laszlo-megathon/0.1 ({CONTACT_EMAIL})"

# Scaleway LLM / vision (shared with the edge functions via root .env)
SCW_BASE_URL = os.environ.get("SCW_BASE_URL", "")
SCW_API_KEY = os.environ.get("SCW_API_KEY", "")
SCW_VISION_MODEL = os.environ.get("SCW_VISION_MODEL", "pixtral-12b-2409")

STORED_LANGS = ("en", "nl")
ARKIT_REF_MAX_PX = 1600
HTTP_TIMEOUT = 60

FLAGSHIP_OBJECT_NUMBERS = ("SK-C-5", "SK-A-2344")


def ensure_data_dirs() -> None:
    for directory in (DATA_RAW, DATA_ENRICHED, DATA_REFINED, DATA_IMAGES):
        directory.mkdir(parents=True, exist_ok=True)
