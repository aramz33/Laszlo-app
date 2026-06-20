# ADR 0011 — Pipeline de génération des notices neutres

**Statut :** Accepté · 2026-06-15

## Contexte

Aucune source ne fournit directement une base de connaissance Laszlo fiable. Il faut
collecter / fabriquer des notices neutres ancrées, à l'échelle, sans halluciner (le
grounding est le produit). Les angles de médiation sont appliqués au runtime, pas stockés
comme des notices séparées.

## Décision durable — pipeline semi-automatisé

1. **Ingestion métadonnées** — Paris Musées API + Wikidata QID + Joconde (titre, artiste, date, medium, image HD). [auto, hors Megathon]
2. **Collecte des sources de grounding** par œuvre — Wikipedia, notice musée publique, SemArt (si match), termes Getty AAT. [auto]
3. **Génération / consolidation de la notice neutre** — LLM **contraint aux sources collectées**, pivot EN si utile, chaque affirmation cite sa source.
4. **Gate de groundedness** (NON négociable) — 2e LLM vérifie que chaque phrase est soutenue par une source citée ; sinon flag. Aucune notice n'entre en base sans passer la gate. [auto]
5. **Revue humaine** — **musée POC uniquement** (~20-30 œuvres) ; statut `draft → reviewed`.
6. **Embeddings** pgvector.
7. **Synthèse couche éditoriale musée** (provisoire, ADR 0008), statut `synthétisé`.

**Statut par notice** : `draft` / `verified` / `reviewed`. Au runtime, on préfère `reviewed` pour le musée POC et on dégrade proprement ailleurs. Le **corpus largeur** (Met / Paris étendu) est généré + vérifié automatiquement, **sans relecture humaine**.

## Posture Megathon — 2026-06-20

Le pipeline actif est Rijksmuseum -> Supabase, **ETL médaillon léger (raw → refined →
load), 100 % sans LLM** (révision 20/06). Le LLM n'intervient qu'au runtime (génération)
et au **sync ultérieur** (angles de médiation + gate groundedness LLM) — déférés.

1. **Harvest** : OAI-PMH `ListRecords` sur le set **`260214`** (Top 1000, inclut les
   phares ; `26121`/`26021` écartés), `edm`, pagination `resumptionToken` →
   `data/raw/*.xml` (parser défensif, re-transformable).
2. **Enrich (sans LLM)** : **Wikidata** (pont n° d'inventaire P217 + collection P195 →
   Q-id, mouvement P135, tags P180/P136, sitelinks) pour **toutes** + **Wikipedia**
   (extrait narratif) **là où l'article existe** (gate) → `data/enriched/*.json`.
3. **Refine** : parse EDM, dimensions en cm (poids ignoré), créateur via Linked Art,
   imageId IIIF direct (`edm:isShownBy`), filtre image + CC0 → `data/refined/*.json`.
4. **Transform** : graphe `artist/movement/museum` + **notices par source** (rijks `ok`,
   wikipedia `review`) — **pas d'angles stockés** + hotspots des phares (main).
5. **Load** : upsert idempotent Supabase + reference images AR (rendition IIIF) en
   Storage **pour les œuvres trackées** seulement.
6. **Manual review** : Adam enrichit/révise les notices des phares (`review` → `ok`).

Statuts Megathon : `groundedness = ok|review`. Une notice phare doit être `ok` avant la
démo. **Angles de médiation runtime = boutons/instructions de génération**, pas une
étape de ce pipeline et pas une colonne `notice.facet`.

## Options considérées

| Option | Statut | Raison |
|---|---|---|
| Tout auto, sans revue | Rejeté | une notice fausse = crédibilité morte |
| **Semi-auto + gate groundedness + revue POC** | **Retenu** | qualité là où ça compte, échelle ailleurs |
| Tout manuel | Rejeté | ne scale pas |

## Conséquences

- (+) Garantie d'ancrage systématique ; revue concentrée sur la démo.
- (−) Prévoir un mini back-office de revue + le composant gate de vérification.
