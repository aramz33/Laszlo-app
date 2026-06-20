# Pipeline de connaissance Laszlo

Ingestion Rijksmuseum + enrichissement multi-sources (Wikidata, Wikipedia) →
Supabase. **100 % sans LLM.** Contrat = `../docs/data-model.md`.

## Setup

```bash
pip install -r pipeline/requirements.txt
cp pipeline/.env.example pipeline/.env   # puis renseigner SUPABASE_URL / SUPABASE_KEY
```

Prérequis Supabase :
1. Créer un projet Supabase → copier `Project URL` + clé **`service_role`** dans `.env`.
2. SQL editor → exécuter `supabase/schema.sql`.
3. Créer un bucket Storage **public** nommé `artworks` (pour les reference images AR).

## Commandes

```bash
python -m pipeline.main harvest        --set 260214 --limit 30   # OAI → data/raw/*.xml
python -m pipeline.main enrich                      --limit 30   # Wikidata + Wikipedia → data/enriched/
python -m pipeline.main refine                      --limit 30   # → data/refined/*.json
python -m pipeline.main transform                   --limit 30   # graphe + notices + hotspots (dry-run)
python -m pipeline.main load                        --limit 30   # → Supabase + Storage
python -m pipeline.main all            --set 260214               # tout, Top 1000
python -m pipeline.main update-hotspots                           # maj coords+texte hotspots phares en DB (depuis flagships.py, sans pipeline complet)
```

`--limit` débugge sur un sous-ensemble. Sans `--limit`, le set complet (260214 = Top 1000,
1040 œuvres, inclut les phares).
Chaque étape est **idempotente** et **re-runnable depuis le cache local** (les fichiers
déjà produits sont sautés) → résiste aux coupures réseau et au breaking change EDM.

## Architecture (ETL médaillon)

```
raw/      data/raw/{objectNumber}.xml      harvest OAI (défensif)
enriched/ data/enriched/{stem}.json        Wikidata (Q-id, mouvement, tags, sitelinks) + Wikipedia (gate)
refined/  data/refined/{stem}.json         dims cm, créateur Linked Art, filtre image+CC0
load                                        upsert Supabase + Storage (idempotent)
```

- **notice** = substrat neutre, 1 ligne par (œuvre × `lang` × `source`) ; `rijks` → `ok`,
  `wikipedia` → `review`. Les angles de médiation sont **runtime**, pas du stockage.
- **Lecture app** = PostgREST auto de Supabase :
  `GET /rest/v1/artwork?select=*,notice(*),hotspot(*)`.
- **Hors scope** (sessions suivantes) : angles de médiation runtime, glossaire gradué,
  profil utilisateur neutre, TTS live (`audio_url` cache optionnel), embeddings, mémoire.
