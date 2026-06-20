# Handoff — reprise dev (Siffrein)

> Point de reprise après la session du 2026-06-20 (build solo Adam de la couche
> Connaissance). Lis d'abord **`docs/ONBOARDING.md`** (vue d'ensemble + carte du repo +
> le contrat). Ce doc ne répète pas l'ONBOARDING : il dit **où on en est exactement** et
> **quoi attaquer**.

## État actuel (vérifié end-to-end)

La **couche Connaissance est en prod sur Supabase** et lisible par l'app :

- Projet Supabase : `spbrkgoseabpsxzkkyzj` (région UE). Données chargées via le pipeline.
- Contenu : **1025 œuvres · 373 artistes · 7 mouvements · 1769 notices · 8 hotspots**
  (corpus = set Rijks **`260214` Top 1000**, inclut les phares).
- **Phares** riches + hotspots : Night Watch `SK-C-5`, Laitière `SK-A-2344` (notices
  Wikipedia EN+NL + 4 hotspots chacun + ref image ARKit en Storage).
- **Read path app validé** (PostgREST + clé publishable) :
  `GET /rest/v1/artwork?object_number=eq.SK-C-5&select=*,notice(*),hotspot(*)` → OK.
- Storage public OK : `…/storage/v1/object/public/artworks/ref/SK-C-5.jpg` (HTTP 200).

## Ce qu'il faut savoir pour ne pas se tromper

- **`notice` = substrat neutre** (faits ancrés), pas le texte final. La perso (longueur/
  niveau/angle) + la langue se font **au runtime** (LLM). Détail : `docs/data-model.md`.
- **Facettes = lentilles runtime + boutons UI**, pas stockées (taxonomie non figée).
- **Langues stockées = EN + NL** ; FR & autres = générées au runtime.
- **Hotspots = seulement les 2 phares** (8 au total), **écrits à la main** dans
  `pipeline/hotspots/flagships.py` (mes textes = provisoires, à réviser). Les 1023 autres
  œuvres ont des notices mais pas de hotspots (c'est voulu : « demo deep »).
- **`audio_url` des hotspots = null** (TTS pas encore branché).
- **Couverture Q-id ~45 %** : normal, le Top 1000 est multi-médias (sculptures/estampes
  peu présentes sur Wikidata) ; les peintures (dont les phares) sont bien couvertes.
- **Clés** : l'app lit avec la clé **publishable** (anon, RLS lecture). La clé **secrète**
  (écriture pipeline) **n'est PAS dans le repo** — elle est dans `pipeline/.env` local
  (gitignored) ; la récupérer au dashboard si besoin (cf. `pipeline/README.md`).

## Prochaines étapes (à se répartir à 2)

**App iOS — lane temps réel (Siffrein, priorité) :**
1. Scaffold Xcode/Swift + lecture Supabase (`supabase-swift`, clé publishable).
2. Vue AR : détection œuvre (reference images depuis `ref_image_url` + `height_cm`/
   `width_cm`) → point ancré → vue détail 2D.
3. Hotspots (depuis la DB) + lecteur audio + chat libre (voix).
4. Paywall Mollie + déploiement.

**Reste couche Connaissance (Adam, court terme) :**
- Faceting LLM (angles en lentilles runtime) ; TTS pour remplir `hotspot.audio_url` ;
  révision main des notices phares (`review` → `ok`) ; plus de hotspots si besoin démo.

**Sessions de design suivantes (à griller à froid, ensemble) :**
- Couches **Personnalisation** (profil 3 axes, persona, cadrage musée) puis **Mémoire**.

## Comment relancer / modifier le pipeline

`pipeline/README.md` (setup + commandes). Le cache local `data/` est **gitignored**
(régénérable ; la vérité vit dans Supabase). `python -m pipeline.main load --set 260214`
est idempotent.

## Suggested skills (pour l'agent qui reprend)

- **`superpowers:brainstorming`** — avant de construire les features de l'app (explorer
  l'intention/design avant le code).
- **`grill-me`** ou **`grill-with-docs`** — pour la session de design Perso/Mémoire.
- **`context7`** (MCP) — docs à jour `supabase-swift`, ARKit/RealityKit, Vapi, Mollie.
- **`tdd` / `superpowers:test-driven-development`** — pour le code app.
- **`frontend-design`** — si volet PWA/UI.
- **`obsidian-cli`** — contexte projet (notes Megathon, cf. ci-dessous).

## Références (ne pas dupliquer — lire à la source)

- `docs/ONBOARDING.md` — vue d'ensemble, carte du repo, contrat, comment l'app lit.
- `docs/data-model.md` — **le contrat** (schéma + contraintes + 3 couches).
- `docs/adr/` — décisions d'archi (chaque ADR a une « Posture Megathon » à jour).
- `docs/megathon/` — notes stratégiques (0 TODO · 1 Stratégie+journal M0–M23 · 2 Tech ·
  3 Playbook). Miroir des notes Obsidian.
- `pipeline/README.md` — lancer/modifier le pipeline. `supabase/schema.sql` — le DDL.
