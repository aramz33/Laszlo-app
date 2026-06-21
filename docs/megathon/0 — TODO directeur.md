---
tags: [projet/laszlo, megathon, type/todo, statut/actif]
date: 2026-06-20
---

# Megathon — 0. TODO directeur

> **File directeur principal — suivi.** Coche au fur et à mesure. Le contexte/raisonnement est dans [[1 — Stratégie & arène]] · [[2 — Tech & build]] · [[3 — Playbook & questions ouvertes]].
> 🟡 = **tâche de décision** (à trancher, peut générer des sous-tâches).

## Sprint immédiat — par owner

> Rythme de travail : **sprints autonomes de 90 min**, puis convergence 10-15 min.
> L'app avance sur mocks locaux conformes au contrat si le serveur n'est pas prêt.
> **Convergence dure après 2 sprints max (3 h)** : app ↔ serveur/stub réel.

### Adam / Codex — app, data, demo

- [x] **Sprint app 1** : ouvrir une œuvre depuis vraie DB (PostgREST `artwork?select=*,artist,museum,hotspot`), afficher image + hotspots.
- [x] Implémenter les mocks locaux conformes au contrat (fallback `runtime.ts` quand Supabase non configuré) :
  - [x] `/generate mode=hotspot` → JSON batch ;
  - [x] `/generate mode=ask` → simulation `delta/done` ;
  - [x] `/speak` → `audio_url` fixe ;
  - [x] `/transcribe` → transcript fixe.
- [x] Brancher les états hotspot : `idle` → `loading` → `ready` / `fallback` / `error` (`useHotspotTexts`).
- [x] Appliquer le fallback hotspot **3 s** : lire `narration_text`, puis remplacer si le texte perso arrive (`HOTSPOT_FALLBACK_MS`).
- [x] Client `/generate mode=ask` : chat libre + question depuis hotspot/point (`useChat`, SSE via XHR).
- [x] Lecteur audio depuis `audio_url` (`/speak`) (`useAudioPlayer`, expo-av, play/pause).
- [x] Upload audio `/transcribe` en `multipart/form-data` (bouton micro `ChatPanel` → `useVoiceInput`).
- [x] Garder QR/manual fallback prioritaire : même vue détail, même contrat runtime (picker manuel conservé comme repli no-match de `/identify`).
- [x] **Playbook crédits IA épuisés** : procédure ajoutée dans [[3 — Playbook & questions ouvertes]] et référencée dans `AGENTS.md` + `CLAUDE.md`.
- [x] **Convergence 1** : l'app appelle les endpoints réels (`generate`/`speak`/`transcribe`) sur le projet déployé.
- [x] **Convergence dure** : app branchée sur le vrai serveur pour `/generate` (5 modes) + onboarding `persona` → `profile` injecté.
- [x] **`/identify` (repli AR photo)** : capacité câblée (décision Adam) via `useVisionIdentify` (capture caméra `expo-image-picker`) → `identify()` avec les ids candidats de la salle → match vision ouvre la même vue détail (`source: "vision"`) ; no-match/refus → picker manuel. Smoke test curl : `artwork_id` correct (confidence 0.9). **Polish démo 2026-06-21** : bouton « Photo » retiré de l'UI visiteur ; AR + fallback manuel restent visibles.

### Siffrein — serveur, secrets, deploy ✅ (lane livrée)

- [x] Valider le contrat → **figé dans ADR 0014** (+ amendements : `mode=persona`, `mode=followups`, `mode=overview`).
- [x] Créer les Edge Functions (toutes déployées, 86 tests offline, e2e Bruno) :
  - [x] `POST /functions/v1/generate` — 5 modes : `overview` · `hotspot` · `ask` · `persona` · `followups`
  - [x] `POST /functions/v1/speak` — ElevenLabs (opt-in) · Edge · Mistral · Google ; voix par langue
  - [x] `POST /functions/v1/transcribe` — Voxtral, multipart, max 10 MB
  - [x] `POST /functions/v1/identify` — Pixtral, fallback AR
- [x] Configurer env vars serveur (Supabase, SCW, ElevenLabs, Mistral).

**Reste lane Siffrein (par priorité) :**
- [x] **Coords hotspots phares** — placées à la main dans le playground → `update-hotspots` (vérifié 2026-06-21)
- [x] **Notices Wikipedia phares (D3)** — résolu **au runtime** (pas d'édition des dumps en DB) : grounding EN-pivot + strip sections boilerplate + budget 8k tok au bord des sections, dans `generate/lib.ts`. Night Watch 16k→3.9k tok, Milkmaid →6.1k tok (vérifié sur prod 2026-06-21). Substrat `notice` reste complet/sourcé.
- [x] **Choix modèle LLM (M32)** — **`gpt-oss-120b` posé en prod** (confirmé Adam 2026-06-21). Mesuré : overview ~2.2s, ask TTFT ~1.1s / total ~2s. gemma écarté (trop lent, 8–22s).
- [x] ✅ **SÉCU — model override retiré** (2026-06-21) : `body.model` supprimé de `/generate` (code + playground + tests). Le modèle est figé par le secret `SCW_MODEL` côté serveur uniquement.
- [ ] *(hors démo, futur)* **Lens d'intérêt = « power feature »** : angle de médiation (technique/histoire/symbole/personnages) sous forme de skill/commande dans le chat, pas un axe de profil ni un bouton de steering. Plomberie `steering.lens` retirée en attendant (2026-06-21).
- [ ] *(différé, pas tout de suite)* **Streamer `overview` (SSE)** — 1ʳᵉ chose affichée à l'ouverture d'une œuvre, aujourd'hui JSON bloquant (~2,2s) ; en SSE (même mécanique qu'`ask`) → premiers mots en ~1s. Backend trivial, **nécessite Adam côté conso SSE**.
- [ ] **Mollie** — **skippé pour la vidéo 90 s** ; reste un chantier post-démo / preuve commerciale si on veut le réactiver.

## Backend

- [x] 🟡 ~~Figer le **schéma Supabase** (le contrat)~~ → exécuté, **vérifié en prod** (2026-06-20)
  - [x] Créer le projet Supabase + exécuter le SQL (artist / movement / museum / artwork / notice / hotspot)
  - [ ] Générer les types partagés (`/shared`) pour l'app mobile
- [x] Exposer une **API de lecture** fine → **PostgREST auto** (`?select=*,notice(*),hotspot(*)`), lecture validée
- [x] 🟡 ~~Valider le contrat `f()` avec Siffrein~~ → **figé dans ADR 0014** (validé Siffrein × Adam, 2026-06-20). `docs/megathon/4` = log des décisions.
- [x] **Runtime `f()` = Edge Function Supabase** ✅ — 5 modes : `overview`/`hotspot`/`ask`/`persona`/`followups` · 86 tests · déployé
  - [x] **Endpoints** : `POST /generate` · `/speak` (ElevenLabs opt-in + Edge/Google) · `/transcribe` (Voxtral) · `/identify` (Pixtral)
  - [x] 🟡 **Choisir le modèle LLM** — gemma trop lent (~22s), **`gpt-oss-120b` testé rapide** et **secret prod posé** via `SCW_MODEL`.
- [x] **Edge function `POST /transcribe`** ✅ — Voxtral, multipart, max 10 MB
- [x] **Surface TTS serveur `POST /speak`** ✅ — ElevenLabs (opt-in, voix par langue) · Edge · Google fallback
- [ ] 🟡 **Ajouter `location` au schéma** (musée + galerie, pour charger l'AR par salle) — **hardcode les phares** pour la démo (A3)
- [ ] **Mollie serveur** *(post-démo, skippé pour la vidéo 90 s)* : hosted checkout + webhook « activer offre musée / premium venue »
- [ ] Brancher clé Mollie **test** (dev) puis **live** *(seulement si on réactive la preuve commerciale)*
- [x] Storage Supabase pour images HD + reference images AR (phares ; bucket public `artworks`)
- [ ] Déploiement backend (proche utilisateur)

## Frontend

- [x] 🟡 Décision frontend révisée : client = **Expo React Native + ViroReact** dans `/app-mobile`; Swift ARKit devient un repli iOS
- [ ] 🟡 Décider : PWA sur **Base44** (track Prompt to Paid) vs **Vercel** libre
- [x] Vérifier la **porte toolchain iPhone / AR** : ViroReact fonctionne sur l'iPhone testé par Adam (2026-06-21).
- [ ] Vérifier la **porte distribution produit** : Android APK / lien installable prioritaire via `app-mobile/eas.json` profil `preview` (`distribution: "internal"`). iOS public/TestFlight plus compliqué et non bloquant pour la vidéo.
- [x] Scaffold app mobile Expo React Native + ViroReact — `/app-mobile`
- [x] **Panel flow (wireframe fonctionnel)** — leviers UI inventoriés → **contrat `f()` figé dans ADR 0014**.
- [x] **Recâbler l'app sur Supabase** (vérifié 2026-06-21) : `fetchArtworks` → `supabase.select(ARTWORK_SELECT)` (mapping → domaine), fallback `sampleArtworks` quand pas de config (playbook). `demoArtworks` n'est plus la source mais le repli offline.
- [x] **Hotspots personnalisés** (vérifié 2026-06-21) : `useHotspotTexts` lance le batch `mode=hotspot` à l'entrée, tap = texte prêt, fallback `narration_text` à 3 s.
  - [x] 🟡 Trancher : texte hotspot **personnalisé à chaque ouverture d'œuvre** (pas fixe, pas batch profil golden)
- [ ] **Génération `f()` live** (`/generate mode=ask` streamé) — **chat libre ✅** + **conversation depuis hotspot ancré ✅** avec fil par-hotspot persistant en session courante (`ChatSessionProvider`, `useChat`, `hotspotId`) ; **reste : point placé par l'utilisateur** (tap libre sur l'œuvre + question) + décider la stratégie CV/vision pour comprendre la zone pointée.
- [x] **Follow-ups** (`/generate mode=followups`) (vérifié 2026-06-21) : `chat.refreshFollowups` à l'ouverture du chat, rendus dans `ChatPanel`, tap → `mode=ask`.
- [x] **Call persona** (`/generate mode=persona`) (vérifié 2026-06-21) : `generatePersona` en fin d'onboarding → `persona_summary` stocké (`saveStoredProfile`, AsyncStorage), réinjecté via `profile`.
- [x] **Vue AR** : détection œuvre ViroReact (tracking targets) → **point bleu ancré** — fonctionne sur l'iPhone testé par Adam (2026-06-21).
- [x] Tap point → **vue détail 2D** de l'œuvre — validé avec le flux AR iPhone.
- [x] **Hotspots** sur la vue détail (points DB) (vérifié 2026-06-21) : `HotspotGlow` mappés depuis `artwork.hotspots`.
- [ ] **Lecteur audio** des hotspots + contrôles **vitesse / ton / voix** — **TTS live + play/pause + vitesse ✅** (`AudioDock`, `useAudioPlayer`) ; **reste : ton / voix changeables à la volée**
- [x] **Champ question** (texte + voix) sous l'œuvre → `/generate mode=ask` (vérifié 2026-06-21) : `ChatPanel` + micro `useVoiceInput`, marche avec ou sans hotspot sélectionné.
- [x] **Polish UI happy path démo** (2026-06-21) : onboarding staged + persona reveal, scanner AR-first sans Photo, fallback manuel phares, vue œuvre plein écran, sous-titres hauts, rail capacités discret, Ask dock bas + thread par hotspot explicite. JS-only, pas d'`expo-blur`.
- [x] **Fallback identification par modèle de vision** : capture photo → `/identify` (Pixtral) identifie l'œuvre → ouverture de la vue détail (M31). Capacité conservée en code, **hors UI démo** depuis polish.
- [x] **Fallback sélection manuelle** prêt (même backend + même vue détail) — picker manuel phares validé comme repli démo. QR / overlay 2D = optionnels, pas bloquants pour la vidéo.
- [x] **Onboarding profil** : 3 questions skippables — **QCM 3 axes (motivation · connaissance · profondeur) + intérêts + champ libre + skip ✅** (`OnboardingScreen`) ; **staging + persona reveal ✅** ; considéré suffisant pour la vidéo 90 s.
  - [ ] **Mapping onboarding → input profil LLM** : transformer les sélections (pas les mots bruts) en un fragment riche et bien construit pour `f()` (côté serveur ; le client envoie les sélections) = partie du contrat `f()`
  - [ ] **Profils démo (presets) à définir** : 2-3 profils golden réglés (contraste fort), sélectionnables — **fallback** si saisie live / connexion casse
- [x] **Picker langue** visible, init sur la locale (C2) (vérifié 2026-06-21) : chips langue dans l'onboarding + `LanguageContext`.
- [ ] UI **activation Mollie** (package musée / pilot), plutôt qu'un paywall visiteur dans l'app — **skippé pour cette démo vidéo**.
- [ ] (designer) Identité « doux sur le regard » + transitions ; **scale/proof = pitch/slide, pas écran app démo**

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

- [x] **Notices Wikipedia phares** : l'ancien blocage `review → ok` est **résolu au runtime** (grounding EN-pivot + trimming/budget sections, vérifié prod 2026-06-21). Les dumps restent sourcés en DB ; la démo ne dépend plus d'une édition manuelle des notices.
- [x] **Polir les hotspots phares** : coords `x,y` placées à la main dans le playground → `flagships.py` → `update-hotspots` (vérifié 2026-06-21)
- [ ] *(option scale, hors démo)* enrichissement déterministe à **batcher en 1 seul run prod, avec Adam** : mouvement via créateur (P170→P135, **+184 œuvres** mesurées), parser dims NL, assouplir match Q-id

## Produit

- [x] Audio hotspots généré **live** au runtime (M24) : texte stocké, pas d'`audio_url` pré-rempli par le pipeline
- [x] 🟡 ~~Décider la **voix (STT → LLM → TTS)**~~ → **TTS = ElevenLabs**, **STT = Voxtral**, LLM **TBD** après premier test/stub. Barge-in reste hors happy path.
- [x] **Barge-in = hors happy path** (M16) : archi capable, montré si stable, sinon pitch-only — wow démo = hotspots + Q&A
- [x] Écrire le **happy path** de démo (le chemin exact de dimanche) : build me → look → listen → ask → steer → switch → walk → connect
- [x] ~~Définir les **4 chemins de connaissance** en démo (Défaut/Technique/Histoire/Symbolisme)~~ → remplacé par **lanes/persona** injectées dans `/generate` ; pas de boutons "4 chemins" dans l'UI.
- [x] **Profil 3 questions** skippables (réutiliser, léger) — fait pour la vidéo : onboarding staged + persona reveal.
- [ ] Définir l'**offre Mollie de démo** : paid pilot / package exposition / abonnement musée — skippé pour la vidéo 90 s, à reprendre seulement pour une preuve business.
- [ ] 🟡 Écrire la **feature list complète** freemium / premium / musée, puis en tirer une spec produit post-démo
- [ ] 🟡 Décider : **recrue n°2** (ML/full-stack) vendredi soir selon vivier
- [ ] Cadrer la **coda « phone-less / lunettes »** pour le pitch (non développée)

## Démo

> Format décidé 2026-06-21 : **vidéo 90 s**, pas une démo live. Objectif : montrer un parcours produit crédible + fournir un lien installable/ouvrable. Priorité distribution : **APK/lien Android atteignable** via EAS internal distribution ; iOS public/TestFlight est plus lourd et ne bloque pas la vidéo.

- [ ] **Storyboard vidéo 90 s** : opening AR iPhone → œuvre → hotspot audio/sous-titres → Ask voix/texte → personnalité/langue → preuve scale.
- [ ] **Utiliser Claude Design** si utile pour accélérer le polish visuel, motion, captions et structure de la vidéo.
- [ ] **Lien produit** : produire un artefact partageable (APK / lien Android prioritaire via `eas build -p android --profile preview` ; iOS si simple, sinon vidéo + repo/site).
- [ ] **Logistique stand** : poster A3 vs écran/tablette pour œuvres + QR
- [ ] Vérifier **impression** au venue (sinon imprimer avant)
- [x] **Go/no-go ViroReact** : AR fonctionne sur iPhone ; fallback manuel reste prêt si la prise vidéo rate.
- [ ] **Démo Mollie** : activation d'un package musée/pilot → webhook débloque premium venue + mini-CSV — skippé pour vidéo 90 s.
- [ ] **Dry-run vidéo** chronométré + **liste de coupes** (reco en 1er) — SYNC 4
- [x] **Vidéo backup / format principal** : la vidéo 90 s est maintenant le livrable principal, pas seulement un backup.
- [ ] Tester **wifi/hotspot** + **cache local** des notices phares
- [ ] **QR fallback** systématique prêt — optionnel si l'APK/lien produit suffit.
- [ ] Barge-in montré **seulement si stable** (sinon hors démo)

## Pitch

- [ ] **Répéter ×2-3** le pitch recrutement 1 min (dans le train)
- [ ] **Pitcher** vendredi 19:00 → **recruter le designer**
- [ ] **Draft pitch finale** (hook / vidéo 90 s / why-now / momentum / ask)
- [x] 🟡 Modèle business du pitch tranché : **B2B2C d'abord** (musées paient, visiteurs adoptent), **B2C plus tard** (~5 ans) via signaux agrégés privacy-safe
- [ ] **1 chiffre-choc** (ex. N œuvres ingérées, coût/visiteur estimé, ou package venue activable via Mollie)
- [ ] **1 slide** unique de secours
- [ ] **Q/R jury** : coût IA/visiteur · moat vs ArtScan/Smartify · GTM musées · scaling pipeline
  - **Pistes perf à citer** (pas implémentées, runtime déjà ~2s) : prompt caching du préfixe system+grounding quand le provider le supportera (Scaleway ne le fait pas encore) → batch hotspots & multi-tour quasi gratuits ; budgets de grounding par mode (hotspot/followups < `ask`) ; stream `overview`.
- [ ] **Mentionner (sans implémenter)** : barge-in · couche éditoriale musée (ex. Guernica) · reco open-world par embeddings (scale)
- [ ] **Build-in-Public** : poster la journey (X/LinkedIn) → track gratuite
- [ ] **Pitch workshop** dimanche 12:30
- [ ] **Répéter** dimanche matin (temps protégé, code-free)
- [ ] **SYNC 6** : ordre de passage finale + qui dit quoi

<!-- maj : 2026-06-20 — checkpoint Siffrein après session Devin -->
<!-- maj : 2026-06-21 — checkpoint app vérifié (tsc 0 err) : Supabase, hotspots perso, followups, persona, picker langue, lecteur audio (vitesse), champ question vox/texte = faits ; restent point libre + stratégie vision de zone pointée, ton/voix à la volée. Bonus non tracké : sous-titres TTS (`SubtitleOverlay`) — accessibilité malentendants. -->
<!-- maj : 2026-06-21 — polish UI JS-only vérifié (tsc 0 err) : onboarding staged + persona reveal, scanner AR-first sans Photo, fallback manuel phares, vue œuvre cinématique, rail capacités discret, Ask dock bas/contextuel. -->
<!-- maj : 2026-06-21 — corrections Adam : SCW_MODEL gpt-oss-120b posé en prod ; AR ViroReact fonctionne sur iPhone ; fallback manuel suffisant ; onboarding suffisant ; Mollie skippé ; livrable principal = vidéo 90 s + lien produit/APK si possible. -->

> **Pas de bloquant serveur connu** au 2026-06-21 : `SCW_MODEL=gpt-oss-120b` est posé en prod selon Adam. Prochain sujet structurant : point libre sur l'œuvre + stratégie vision pour comprendre la zone pointée.
