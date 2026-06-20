---
tags: [projet/laszlo, megathon, type/todo, statut/actif]
date: 2026-06-20
---

# Megathon — 0. TODO directeur

> **File directeur principal — suivi.** Coche au fur et à mesure. Le contexte/raisonnement est dans [[1 — Stratégie & arène]] · [[2 — Tech & build]] · [[3 — Playbook & questions ouvertes]].
> 🟡 = **tâche de décision** (à trancher, peut générer des sous-tâches).

## Backend

- [x] 🟡 ~~Figer le **schéma Supabase** (le contrat)~~ → exécuté, **vérifié en prod** (2026-06-20)
  - [x] Créer le projet Supabase + exécuter le SQL (artist / movement / museum / artwork / notice / hotspot)
  - [ ] Générer les types partagés (`/shared`) pour l'app mobile
- [x] Exposer une **API de lecture** fine → **PostgREST auto** (`?select=*,notice(*),hotspot(*)`), lecture validée
- [ ] 🟡 **Figer le contrat `f()` ensemble (Aramsis × Siffrein)** — dérivé du **panel flow** (chaque levier UI = un param d'entrée). À fixer : input/output exact, streaming, états de chargement hotspot, TTS côté serveur. Débloque les 2 lanes.
  - [x] Préparer le support de discussion : `docs/megathon/4 — Notes discussion Siffrein.md`
- [ ] **Runtime `f()` = Edge Function Supabase**, streamé, tient la clé LLM (ADR 0014). **Scope live = génération texte** : hotspots personnalisés à l'entrée de la vue œuvre, chat libre, **point placé par l'utilisateur** (pointer un endroit de l'œuvre + question), **conversation depuis un hotspot ancré**.
  - [ ] **Endpoints** : `POST /generate` (mode `hotspot` ou `ask`) ; `POST /transcribe` (voix→texte).
  - [ ] 🟡 **Choisir le modèle LLM** — critères : **coût / time-to-first-token / qualité FR & multilingue / fidélité au grounding / résidence UE**. Pas fixé. **Mini-éval** : 3 notices phares × 3 candidats (modèle open via **Nebius** = cloud d'inférence open-weights EU, crédits kit · Mistral · Claude API en référence). **Fallback** = Claude API payante (M32).
- [ ] **Edge function `POST /transcribe`** : audio → texte (Voxtral), clé STT serveur (M33)
- [ ] **Surface TTS serveur** : texte généré → audio/stream/URL jouable, clé TTS côté serveur ; l'app garde seulement les contrôles lecture/voix/vitesse/ton
- [ ] 🟡 **Ajouter `location` au schéma** (musée + galerie, pour charger l'AR par salle) — **hardcode les phares** pour la démo (A3)
- [ ] **Mollie serveur** *(dernier — après tout le reste)* : hosted checkout + webhook « activer offre musée / premium venue »
- [ ] Brancher clé Mollie **test** (dev) puis **live** (démo activation package/pilot)
- [x] Storage Supabase pour images HD + reference images AR (phares ; bucket public `artworks`)
- [ ] Déploiement backend (proche utilisateur)

## Frontend

- [x] 🟡 Décision frontend révisée : client = **Expo React Native + ViroReact** dans `/app-mobile`; Swift ARKit devient un repli iOS
- [ ] 🟡 Décider : PWA sur **Base44** (track Prompt to Paid) vs **Vercel** libre
- [ ] Vérifier la **porte toolchain mobile** : Mac + Xcode + Android Studio/EAS + iPhone physique + Android physique
- [x] Scaffold app mobile Expo React Native + ViroReact — `/app-mobile`
- [x] **Panel flow (wireframe fonctionnel)** — livré dans `docs/Laszlo design Megathon.zip` ; inventaire des leviers UI = **base d'entrée du contrat `f()`**.
- [ ] **Recâbler l'app sur Supabase** (l'impl actuelle est jetable : importe un `demoArtworks` fantôme + client Supabase inutilisé) : fetch `artwork?select=*,hotspot(*)&ref_image_url=not.is.null`, mapping → domaine, charger **par salle** (phares pour la démo)
- [ ] **Hotspots personnalisés** : à l'entrée dans la vue œuvre, lancer en async **un `POST /generate mode=hotspot` par hotspot**, en parallèle, avec profil + langue ; le tap hotspot lit le texte généré prêt (fallback : `narration_text` brut si latence)
  - [x] 🟡 Trancher : texte hotspot **personnalisé à chaque ouverture d'œuvre** (pas fixe, pas batch profil golden)
- [ ] **Génération `f()` live** (`/generate mode=ask` streamé) sur : **chat libre**, **point placé par l'utilisateur** (tap libre sur l'œuvre + question), **conversation depuis un hotspot ancré** (grounding = hotspot généré + notices)
- [ ] **Vue AR** : détection œuvre ViroReact (tracking targets) → **point bleu ancré**
- [ ] Tap point → **vue détail 2D** de l'œuvre
- [ ] **Hotspots** sur la vue détail (points pré-définis depuis la DB)
- [ ] **Lecteur audio** des hotspots + contrôles **vitesse / ton / voix** (changeables à la volée) — *audio TTS généré **live** depuis le texte hotspot personnalisé, pas de pré-rendu*
- [ ] **Champ question** (texte + voix) sous l'œuvre → déclenche `/generate mode=ask` ; marche avec ou sans hotspot/point sélectionné
- [ ] **Fallback identification par modèle de vision** : capture du flux → vision (Claude) identifie l'œuvre → positionnement en **overlay 2D** (M31)
- [ ] **Fallback sélection manuelle / QR / overlay 2D** prêt (même backend + même vue détail)
- [ ] **Onboarding profil** : 3 questions skippables **ludiques**, **flux conditionnel** (la suite dépend des réponses), multi-sélection possible → axes neutres (allure/niveau/intérêt) (C1) — *wording = design*
  - [ ] **Mapping onboarding → input profil LLM** : transformer les sélections (pas les mots bruts) en un fragment riche et bien construit pour `f()` (côté serveur ; le client envoie les sélections) = partie du contrat `f()`
  - [ ] **Profils démo (presets) à définir** : 2-3 profils golden réglés (contraste fort), sélectionnables — **fallback** si saisie live / connexion casse
- [ ] **Picker langue** visible, init sur la locale (C2)
- [ ] UI **activation Mollie** (package musée / pilot), plutôt qu'un paywall visiteur dans l'app
- [ ] (designer) Identité « doux sur le regard » + transitions + **écran « scale »** (N œuvres)

## Dataset (pipeline — IntelliJ)

> ✅ **Lane Connaissance livrée en prod** (Supabase `spbrkgoseabpsxzkkyzj`, **vérifié 2026-06-20**) :
> 1025 œuvres · 373 artistes · 7 mouvements · 1769 notices · 8 hotspots.

- [x] 🟡 ~~Décider langage pipeline~~ → **Python**
- [x] 🟡 ~~Session dataset~~ → set **`260214` Top 1000** (~1040 œuvres) ; phares **SK-C-5** + **SK-A-2344**. (Sélection « classique/enfants/abstrait » abandonnée au profit du Top 1000 curé.)
- [x] Scaffold projet (`/pipeline` : harvest / enrich / refine / transform / load + `.env`)
- [x] **Harvest** OAI-PMH du set (`edm`, pagination `resumptionToken`)
- [x] **Parser EDM** → titres/desc EN-NL, créateur, `extent`, rights, imageId
- [x] **Résoudre l'image IIIF** (directement `iiif.micr.io/{id}` via `isShownBy` — pas de détour Linked Art `?_profile=la`)
- [x] **Refine** : `extent` → height/width cm (**57 %** de couverture) ; labels créateur ; filtre image + CC0
- [x] **Reference images AR** → Storage (phares ; `ref/SK-C-5.jpg` public OK)
- [x] **Multilingue pivot-EN** : EN+NL stockés ; autres langues générées au runtime
- [x] ~~Notices 4 facettes (LLM) + gate~~ → **changé** : `notice` = substrat neutre **1 ligne/source** (rijks `ok`, wikipedia `review`), **sans LLM** ; facettes = **lentilles runtime** (non stockées). cf. `data-model.md`
- [x] **Auteur les hotspots** des phares (8 : 4×SK-C-5 + 4×SK-A-2344, coords + aspect + texte)
- [x] **Charger** dans Supabase (upsert idempotent) — vérifié
- [x] ~~Mock DB 2-3 œuvres~~ → superseded : vraies données en prod
- [ ] ⛔ Ignorer le dataset « Challenge 2014 » — obsolète (set curé)

### Phares — reste (focus démo profonde)

- [ ] **Notices Wikipedia phares `review → ok`** : aujourd'hui = **dump brut de l'article entier**, à trimmer en substrat propre (4 notices : SK-C-5 + SK-A-2344 × en/nl) — *jugement à froid*. **Bloque le grounding du chat (`generate mode=ask`)** : trop gros pour un petit modèle → **point à résoudre demain (D3)**
- [ ] **Polir les hotspots phares** : narration provisoire correcte, mais **coords `x,y` à vérifier sur l'image réelle** (besoin de voir l'œuvre) ; ajouter des hotspots si la démo l'exige
- [ ] *(option scale, hors démo)* enrichissement déterministe à **batcher en 1 seul run prod, avec Adam** : mouvement via créateur (P170→P135, **+184 œuvres** mesurées), parser dims NL, assouplir match Q-id

## Produit

- [x] Audio hotspots généré **live** au runtime (M24) : texte stocké, pas d'`audio_url` pré-rempli par le pipeline
- [ ] 🟡 Décider la **voix (cascade STT → LLM → TTS)** — 2 briques distinctes :
  - [ ] **TTS** (parler au visiteur) : ElevenLabs (compte dispo) — latence, barge-in, voix de marque ; vs Vapi (orchestration, qualif track)
  - [ ] **STT** (écouter le visiteur) : Voxtral (Mistral) vs ElevenLabs Scribe
  - [ ] Trancher au plus tard SYNC 1
- [x] **Barge-in = hors happy path** (M16) : archi capable, montré si stable, sinon pitch-only — wow démo = hotspots + Q&A
- [x] Écrire le **happy path** de démo (le chemin exact de dimanche) — livré dans `docs/Laszlo design Megathon.zip` : build me → look → listen → ask → steer → switch → walk → connect
- [x] ~~Définir les **4 chemins de connaissance** en démo (Défaut/Technique/Histoire/Symbolisme)~~ → remplacé par **lanes/persona** injectées dans `/generate` ; pas de boutons "4 chemins" dans l'UI.
- [ ] **Profil 3 questions** skippables (réutiliser, léger) — *persona auto = vision, hors démo*
- [ ] Définir l'**offre Mollie de démo** : paid pilot / package exposition / abonnement musée
- [ ] 🟡 Écrire la **feature list complète** freemium / premium / musée, puis en tirer une spec produit post-démo
- [ ] 🟡 Décider : **recrue n°2** (ML/full-stack) vendredi soir selon vivier
- [ ] Cadrer la **coda « phone-less / lunettes »** pour le pitch (non développée)

## Démo

- [ ] **Logistique stand** : poster A3 vs écran/tablette pour œuvres + QR
- [ ] Vérifier **impression** au venue (sinon imprimer avant)
- [ ] **Go/no-go ViroReact → fallback sélection/QR/overlay 2D** si anchors instables
- [ ] **Démo Mollie** : activation d'un package musée/pilot → webhook débloque premium venue + mini-CSV
- [ ] **Dry-run** chronométré + **liste de coupes** (reco en 1er) — SYNC 4
- [ ] **Vidéo backup** de la démo (avant la nuit de samedi)
- [ ] Tester **wifi/hotspot** + **cache local** des notices phares
- [ ] **QR fallback** systématique prêt
- [ ] Barge-in montré **seulement si stable** (sinon hors démo)

## Pitch

- [ ] **Répéter ×2-3** le pitch recrutement 1 min (dans le train)
- [ ] **Pitcher** vendredi 19:00 → **recruter le designer**
- [ ] **Draft pitch finale** (hook / démo live / why-now / momentum / ask)
- [x] 🟡 Modèle business du pitch tranché : **B2B2C d'abord** (musées paient, visiteurs adoptent), **B2C plus tard** (~5 ans) via signaux agrégés privacy-safe
- [ ] **1 chiffre-choc** (ex. N œuvres ingérées, coût/visiteur estimé, ou package venue activable via Mollie)
- [ ] **1 slide** unique de secours
- [ ] **Q/R jury** : coût IA/visiteur · moat vs ArtScan/Smartify · GTM musées · scaling pipeline
- [ ] **Mentionner (sans implémenter)** : barge-in · couche éditoriale musée (ex. Guernica) · reco open-world par embeddings (scale)
- [ ] **Build-in-Public** : poster la journey (X/LinkedIn) → track gratuite
- [ ] **Pitch workshop** dimanche 12:30
- [ ] **Répéter** dimanche matin (temps protégé, code-free)
- [ ] **SYNC 6** : ordre de passage finale + qui dit quoi

<!-- maj : 2026-06-20 -->
