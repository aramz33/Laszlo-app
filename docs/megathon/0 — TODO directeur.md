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
- [ ] **Runtime `f()` = Edge Function Supabase** : `POST /generate` (notice+profil+langue → texte streamé), tient la clé LLM (ADR 0014)
  - [ ] 🟡 **Valider le modèle sur Nebius** (crédits kit) → sinon clé Claude API payante (M32)
- [ ] **Edge function `POST /transcribe`** : audio → texte (Voxtral), clé STT serveur (M33)
- [ ] 🟡 **Ajouter `location` au schéma** (musée + galerie, pour charger l'AR par salle) — **hardcode les phares** pour la démo (A3)
- [ ] **Mollie serveur** : hosted checkout + webhook « débloquer premium »
- [ ] Brancher clé Mollie **test** (dev) puis **live** (stand)
- [x] Storage Supabase pour images HD + reference images AR (phares ; bucket public `artworks`)
- [ ] Déploiement backend (proche utilisateur)

## Frontend

- [x] 🟡 Décision frontend révisée : client = **Expo React Native + ViroReact** dans `/app-mobile`; Swift ARKit devient un repli iOS
- [ ] 🟡 Décider : PWA sur **Base44** (track Prompt to Paid) vs **Vercel** libre
- [ ] Vérifier la **porte toolchain mobile** : Mac + Xcode + Android Studio/EAS + iPhone physique + Android physique
- [x] Scaffold app mobile Expo React Native + ViroReact — `/app-mobile`
- [ ] **Recâbler l'app sur Supabase** (l'impl actuelle est jetable : importe un `demoArtworks` fantôme + client Supabase inutilisé) : fetch `artwork?select=*,hotspot(*)&ref_image_url=not.is.null`, mapping → domaine, charger **par salle** (phares pour la démo)
- [ ] **Brancher la génération `f()`** sur tap hotspot (ADR 0014, `/generate` streamé). **Stopgap tant que `f()` pas prête** : afficher `narration_text` brut (= substrat, pas le texte final), à remplacer par le texte généré
- [ ] **Vue AR** : détection œuvre ViroReact (tracking targets) → **point bleu ancré**
- [ ] Tap point → **vue détail 2D** de l'œuvre
- [ ] **Hotspots** sur la vue détail (points pré-définis depuis la DB)
- [ ] **Lecteur audio** des hotspots + contrôles **vitesse / ton / voix** (changeables à la volée) — *audio généré **live** au runtime (M24), pas de pré-rendu*
- [ ] **Chat libre** : poser des questions + taper hors hotspots → réponse vocale/texte
- [ ] **Fallback identification par modèle de vision** : capture du flux → vision (Claude) identifie l'œuvre → positionnement en **overlay 2D** (M31)
- [ ] **Fallback sélection manuelle / QR / overlay 2D** prêt (même backend + même vue détail)
- [ ] **Onboarding profil** : 3 questions skippables **ludiques** → axes neutres (allure/niveau/intérêt), `AsyncStorage` (C1) — *wording = design*
- [ ] **Picker langue** visible, init sur la locale (C2)
- [ ] UI **paywall Mollie** dans l'app
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

- [ ] **Notices Wikipedia phares `review → ok`** : aujourd'hui = **dump brut de l'article entier**, à trimmer en substrat propre (4 notices : SK-C-5 + SK-A-2344 × en/nl) — *jugement à froid*. **Bloque le grounding du chat (`ask`)** : trop gros pour un petit modèle → **point à résoudre demain (D3)**
- [ ] **Polir les hotspots phares** : narration provisoire correcte, mais **coords `x,y` à vérifier sur l'image réelle** (besoin de voir l'œuvre) ; ajouter des hotspots si la démo l'exige
- [ ] *(option scale, hors démo)* enrichissement déterministe à **batcher en 1 seul run prod, avec Adam** : mouvement via créateur (P170→P135, **+184 œuvres** mesurées), parser dims NL, assouplir match Q-id

## Produit

- [x] Audio hotspots généré **live** au runtime (M24) : texte stocké, pas d'`audio_url` pré-rempli par le pipeline
- [ ] 🟡 Décider : **voix / TTS** (compte ElevenLabs dispo)
  - [ ] Recherche intensive : ElevenLabs vs Vapi (latence, barge-in, voix de marque, qualif track Vapi)
  - [ ] Trancher au plus tard SYNC 1
- [ ] **Barge-in = hors happy path** (M16) : archi capable, montré si stable, sinon pitch-only — wow démo = hotspots + Q&A
- [ ] Écrire le **happy path** de démo (le chemin exact de dimanche) — SYNC 1
- [ ] Définir les **4 chemins de connaissance** en démo (Défaut/Technique/Histoire/Symbolisme)
- [ ] **Profil 3 questions** skippables (réutiliser, léger) — *persona auto = vision, hors démo*
- [ ] Définir le **montant paywall** premium (1–3 €)
- [ ] 🟡 Décider : **recrue n°2** (ML/full-stack) vendredi soir selon vivier
- [ ] Cadrer la **coda « phone-less / lunettes »** pour le pitch (non développée)

## Démo

- [ ] **Logistique stand** : poster A3 vs écran/tablette pour œuvres + QR
- [ ] Vérifier **impression** au venue (sinon imprimer avant)
- [ ] **Go/no-go ViroReact → fallback sélection/QR/overlay 2D** si anchors instables
- [ ] **Paiement réel au stand** (clé live) → compter les **conversions €** + mini-CSV
- [ ] **Dry-run** chronométré + **liste de coupes** (reco en 1er) — SYNC 4
- [ ] **Vidéo backup** de la démo (avant la nuit de samedi)
- [ ] Tester **wifi/hotspot** + **cache local** des notices phares
- [ ] **QR fallback** systématique prêt
- [ ] Barge-in montré **seulement si stable** (sinon hors démo)

## Pitch

- [ ] **Répéter ×2-3** le pitch recrutement 1 min (dans le train)
- [ ] **Pitcher** vendredi 19:00 → **recruter le designer**
- [ ] **Draft pitch finale** (hook / démo live / why-now / momentum / ask)
- [ ] **1 chiffre-choc** (inclure le nb de paiements réels)
- [ ] **1 slide** unique de secours
- [ ] **Q/R jury** : coût IA/visiteur · moat vs ArtScan/Smartify · GTM musées · scaling pipeline
- [ ] **Mentionner (sans implémenter)** : barge-in · couche éditoriale musée (ex. Guernica) · reco open-world par embeddings (scale)
- [ ] **Build-in-Public** : poster la journey (X/LinkedIn) → track gratuite
- [ ] **Pitch workshop** dimanche 12:30
- [ ] **Répéter** dimanche matin (temps protégé, code-free)
- [ ] **SYNC 6** : ordre de passage finale + qui dit quoi

<!-- maj : 2026-06-20 -->
