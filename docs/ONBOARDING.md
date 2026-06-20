# Onboarding — catch-up Siffrein

> But : te remettre dans le repo en 10 minutes. On travaille à deux dessus à partir
> de maintenant. Ce doc est un **overview high-level** ; les détails font foi dans
> `docs/data-model.md`, les ADR (`docs/adr/`) et `pipeline/README.md`.

## 1. C'est quoi Laszlo (rappel)

Un **guide de musée conversationnel** : tu te tiens devant une œuvre, tu lui parles,
elle te répond dans son registre, adaptée à ton niveau. Stratégie Megathon =
**build broad, demo deep** : un pipeline ingère une large tranche du Rijksmuseum (la
preuve qu'on cure du contenu **à l'échelle, ancré** = l'anti-wrapper), la démo va en
**profondeur sur 1-2 œuvres phares** (le wow voix).

## 2. L'architecture en 3 couches (modèle mental partagé)

```
CONNAISSANCE (partagée)        ← CONSTRUITE (cette session)
  graphe œuvres + notices (substrat neutre ancré) + tags
        │ alimente
PERSONNALISATION (par user)    ← session suivante (designée + pitchée)
  profil 3 axes (Allure / Niveau / Centre d'intérêt) + persona + cadrage musée
        │ alimente
MÉMOIRE (apprend dans le temps) ← session suivante (slots + pitch)
        │ génère
  SORTIE = phrase dite à l'utilisateur = f(notice, profil/persona, mémoire, langue)
```

**Décision pivot à retenir :** la `notice` est un **substrat neutre ancré**, jamais le
texte final. La personnalisation (longueur, niveau, angle) + la langue + le ton
s'appliquent **au runtime** par le LLM. Un texte pré-mâché ne pourrait ni s'adapter ni
apprendre — d'où ce choix. Les 4 « chemins » (Défaut/Technique/Histoire/Symbolisme) sont
des **lentilles runtime + boutons UI**, pas des colonnes stockées (taxonomie non figée).

## 3. Ce qui a été fait (couche Connaissance)

Un **pipeline de données** (`pipeline/`, Python, IntelliJ) qui ingère le Rijksmuseum et
l'enrichit multi-sources, **100 % sans LLM**, vers Supabase.

ETL médaillon `raw → enriched → refined → load` :
- **harvest** — OAI-PMH du set **`260214`** (« Top 1000 », **1040 œuvres**, inclut les
  phares) → `data/raw/*.xml` (parser défensif).
- **enrich** — **Wikidata** (Q-id + mouvement + tags + sitelinks, pour toutes) +
  **Wikipedia** (extrait narratif, là où l'article existe → gate, sinon repli Rijks).
- **refine** — dimensions cm, créateur via Linked Art, imageId IIIF, filtre image + CC0.
- **transform** — graphe `artist/movement/museum` + **notices par source** (rijks `ok`,
  wikipedia `review`) + hotspots des phares (authored main).
- **load** — upsert idempotent Supabase + reference images ARKit en Storage.

Pourquoi multi-sources : la description Rijks est **courte** (phare = 544 car.) et
**~vide pour beaucoup d'œuvres** → Rijks = métadonnées fiables, **Wikipedia = la
narration**, **Wikidata = les faits structurés du graphe**.

## 4. Carte du repo

| Chemin | Quoi |
|---|---|
| `docs/data-model.md` | **Le contrat** : schéma Supabase + principes. À lire en premier. |
| `docs/adr/` | Décisions d'archi (0001 hexagonal, 0002 connaissance, 0011 pipeline…). |
| `pipeline/` | Le pipeline Python (lane data). `README.md` = setup + commandes. |
| `supabase/schema.sql` | DDL de la couche Connaissance (à exécuter dans Supabase). |
| `data/` | Cache local du pipeline (raw / enriched / refined) — non versionné. |

## 5. Le contrat = comment l'app lit les données

L'app **lit Supabase directement via PostgREST** (l'API REST auto). Pas de backend custom
à appeler pour la lecture. Exemple — tout ce qu'il faut pour une œuvre, en une requête :

```
GET /rest/v1/artwork?object_number=eq.SK-C-5&select=*,notice(*),hotspot(*)
```

Schéma (détail + contraintes dans `docs/data-model.md`) :

```sql
artwork  (object_number, title_en, title_nl, year, height_cm, width_cm,
          image_url, ref_image_url, artist_id, movement_id, museum_id, tags, ...)
notice   (artwork_id, lang, source, text, sources, groundedness)  -- substrat neutre
hotspot  (artwork_id, x, y, title, aspect, narration_text, audio_url, duration_s, ord)
```

À savoir pour l'app :
- **ARKit** : `height_cm`/`width_cm` (taille physique) + `ref_image_url` (image de
  tracking) sont là pour générer les `ARReferenceImage`.
- **Hotspots** : `x`,`y` normalisés [0,1] sur l'image de l'œuvre ; `audio_url` est `null`
  pour l'instant (TTS pas encore branché).
- **Langues** : seules `en`+`nl` sont stockées ; FR (et autres) seront **générés au
  runtime** depuis le grounding.
- **Phares** : Night Watch `SK-C-5`, La Laitière `SK-A-2344` (notices Wikipedia riches +
  hotspots authored).
- Lecture côté app = clé **`anon`** (RLS lecture seule). La clé `service_role` reste
  côté pipeline uniquement.

## 6. Lancer le pipeline / Supabase

Détail dans `pipeline/README.md`. En bref :
```bash
pip install -r pipeline/requirements.txt
cp pipeline/.env.example pipeline/.env      # renseigner SUPABASE_URL + clé service_role
# Supabase : créer le projet, exécuter supabase/schema.sql, créer le bucket public "artworks"
python -m pipeline.main all --set 260214    # tout le corpus
```

## 7. La suite (ce qu'on attaque à deux)

**Reste sur la couche Connaissance (court terme) :**
- [ ] Brancher Supabase réel + premier `load` complet (1040 œuvres) — *prérequis projet
      Supabase.*
- [ ] **Faceting LLM** : générer les angles (technique/histoire/symbolisme) en lentilles
      runtime à partir du substrat. (Choix clé LLM à régler — Codex MAX / OpenAI API.)
- [ ] **TTS** : remplir `hotspot.audio_url` (provider voix ouvert — ElevenLabs / Vapi).
- [ ] Révision main des notices des 2 phares (`review` → `ok`).

**App iOS (ARKit) — lane temps réel :**
- [ ] Scaffold app Xcode/Swift, lecture Supabase (supabase-swift, clé anon).
- [ ] Vue AR : détection œuvre (reference images) → point ancré → vue détail 2D.
- [ ] Hotspots + lecteur audio + chat libre (voix).
- [ ] Paywall Mollie + déploiement.

**Sessions de design suivantes (à griller à froid) :**
- [ ] Couche **Personnalisation** (profil 3 axes, persona, cadrage musée) — tables + runtime.
- [ ] Couche **Mémoire** (apprend de l'utilisateur) — slots schéma + pitch.

## 8. Où sont les décisions

- **Archi & pourquoi** : `docs/adr/` (chaque ADR a une « Posture Megathon » à jour).
- **Journal des décisions Megathon** : note Obsidian *« 1 — Stratégie & arène »* →
  journal `M0–M23` (M18–M23 = cette session : notice substrat, enrichissement
  Wikidata/Wikipedia, corpus Top 1000, 3 couches).
- **Tech & build** : note Obsidian *« 2 — Tech & build »*.

> Principe de travail : **les docs sont vivantes**. Quand une décision change ce qui est
> écrit, on met la doc à jour dans la foulée (data-model + ADR concernés).
