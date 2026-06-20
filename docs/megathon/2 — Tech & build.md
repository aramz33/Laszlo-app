---
tags: [projet/laszlo, megathon, type/plan, statut/actif]
date: 2026-06-20
---

# Megathon — 2. Tech & build

> **Doc ground-truth 2/3** — le « comment » technique : posture par décision, reconnaissance/AR, flux app, schéma de données, pipeline, timeline 45h, TODO.
> Contexte : [[1 — Stratégie & arène]] · Animation + à trancher : [[3 — Playbook & questions ouvertes]].
> Miroir du wiki technique (ADR `Laszlo-app/docs/adr/`). Certaines sections historiques
> décrivent le plan initial ; la section **Mise à jour — session pipeline** et
> `docs/data-model.md` font foi pour le contrat actuel.

## Le principe qui débloque tout

L'archi est **hexagonale** : surface client jetable + cœur + **adaptateurs sortants swappables** (LLM / STT / TTS / Retriever / CV).

→ **Conséquence :** on branche les providers **les plus rapides à démoer** **sans trahir** la direction prod UE+coût (ADR 0012). Le provider est un port. L'utiliser 45h = on **prouve l'abstraction**, on ne s'y marie pas. Argument à tenir avec Siffrein (auteur de la direction souveraine UE).

## Décisions verrouillées (session 20/06)

- **Reconnaissance = ViroReact image tracking** pour la démo produit. Les embeddings sortent du runtime (gardés comme story d'échelle pitch + chantier post-hackathon). Voir ci-dessous.
- **Codebase = monorepo, 2 outils :** **pipeline + backend en IntelliJ (Adam)** · **app mobile Expo React Native dans `/app-mobile` (Siffrein)**. ViroReact impose des builds natifs, mais garde l'essentiel du produit en TypeScript.
- **Voix / TTS = OUVERT** — compte **ElevenLabs** dispo ; arbitrage ElevenLabs vs Vapi (track) à trancher **après recherche** (cf. [[3 — Playbook & questions ouvertes]]). Le pipeline reste **agnostique à la voix** : on stocke le *texte* des hotspots, la génération audio est une étape séparée.

- **Barge-in = hors happy path** (M16). On garde une **archi voix full-duplex capable**, mais couper l'IA en cours de parole n'est **pas** dans le chemin de démo (jugé « pas un vrai waouh », notes 20/06) → montré si stable/gratuit, sinon **pitch-only**. Wow démo = **audio guide hotspots + Q&A**.

## Posture week-end par décision

| ADR / sujet | Cible prod (figée) | Posture **week-end** |
|---|---|---|
| D1 Hexagonal, front mince + orchestrateur Python/FastAPI | Next.js PWA + FastAPI | **Simplifier** : backend = chemin le plus court vers le wow |
| D2 Graphe d'entités + récup. hybride + pgvector | Postgres/pgvector, pas de chunk-RAG | **Construire (light)** : c'est le **clever-tech**. Pipeline ingère Rijks (EDM) → graphe Œuvre/Artiste/Mouvement → Supabase. La forme du graphe = preuve qu'on est laszlo, pas un chatbot |
| D3 Voix cascade STT→LLM→TTS + barge-in | Pipeline maison full-duplex/AEC | **Remplacer par sponsor** : barge-in + streaming clés-en-main = le wow, en heures. **Provider à trancher (ElevenLabs/Vapi)** |
| D4 Profil 3 questions skippables | Onboarding 3 taps | **Réutiliser** (léger) : préférences neutres visibles en démo, pas personas nommés |
| D5/D12 Sourcing notices + gate groundedness | Semi-auto + revue humaine | **Construit (light)** : notices neutres par source (`rijks`/`wikipedia`) + provenance. Angles de médiation runtime et gate LLM approfondie = après |
| **D7 Identification œuvre** | QR/NFC POC → CV MVP | **Ré-ouvert → ViroReact image tracking** : voir la décision ci-dessous. Sélection manuelle + QR + overlay 2D = filets |
| D9 Multilingue pivot EN | DeepL + LLM multilingue | **Garder en démo live** : question en FR puis EN = effet « waouh » quasi gratuit (les métadonnées Rijks sont déjà EN+NL) |
| D6/D13 Hybride on-device + UE residency + éval-gated | Self-host Mistral/Voxtral/Cartesia | **Ignorer ce week-end** : zéro self-host, zéro éval. Providers managés. Ré-aligner après |
| Vision = embeddings (pas LLM) | SigLIP/DINO + pgvector | **Hors runtime ce week-end** : ViroReact fait la reco sur set curé. Embeddings = story d'échelle (pitch) + post-hackathon (reco open-world). |

---

## Reconnaissance & AR — décision : ViroReact

> Direction de record révisée (20/06). Le produit mobile part sur Expo React Native + ViroReact ; Swift ARKit direct reste un repli iOS, pas le chemin principal.

### Comment ViroReact reconnaît l'œuvre

ViroReact **image tracking** (`ViroARTrackingTargets` + `ViroARImageMarker`) fait **deux choses en un seul step**, via ARKit sur iOS et ARCore sur Android :
1. **Reconnaissance** — il matche le flux caméra contre le **set d'images de référence** qu'on a pré-chargées (nos œuvres préparées) et te dit *laquelle* est en vue.
2. **Ancrage** — il donne une pose exploitable pour afficher un **anchor** (le point bleu) attaché à l'œuvre détectée.

→ **Pas de similarity search par embeddings au runtime.** Pour un set curé d'œuvres, ViroReact suffit comme adaptateur de reconnaissance. Les embeddings (CLIP/SigLIP : encoder l'image caméra, chercher le plus proche voisin dans la base) sont une **méthode alternative**, utile seulement pour la reco **open-world** (œuvre hors set) ou le scale — on la garde pour le **pitch** (« on reconnaît 60M d'œuvres ») et **l'après-hackathon**, pas pour la démo.

### Le feature

Le visiteur pointe son téléphone vers le mur. Un **petit point bleu se colle à l'œuvre** détectée. On **tape le point** → l'œuvre s'ouvre. La surface AR reste volontairement minimale ; l'expérience riche se passe dans la vue détail 2D.

### Pourquoi ViroReact, et pas Swift direct / web / Unity

| Option | Verdict | Raison |
|---|---|---|
| **WebXR dans la PWA** | ❌ écarté | Safari iPhone n'implémente pas les modules AR WebXR. Ancrage 3D persistant impossible côté web sur iOS. |
| **WebAR SLAM / 8th Wall** | ❌ écarté | Le hosted platform 8th Wall a été retiré en 2026 ; workflow moins aligné avec l'app mobile. |
| **Unity (AR Foundation)** | ❌ écarté | iOS+Android d'un code, mais trop lourd et trop orienté scène/éditeur pour une app guide + voix + contenu. |
| **Swift ARKit + RealityKit** | 🔁 repli iOS | Meilleur contrôle iOS, mais iOS-only et moins agent-friendly. |
| **ViroReact + Expo React Native** | ✅ retenu | Cross-platform mobile, UI/voix/chat en TypeScript, image tracking suffisant pour point ancré + vue détail. |

### Échelle de fallback

1. **ViroReact image tracking** (primaire) — point ancré, iOS + Android.
2. **Sélection manuelle / QR par œuvre** — même backend + même vue détail.
3. **Overlay 2D écran** — même UI popup/voix, rendu marqueur sans anchor monde. **+ vidéo backup** de la démo.

*(Les embeddings ne sont plus dans cette échelle : reco set curé = ViroReact, point.)*

### Go/no-go

Si les anchors ViroReact ne sont pas stables **sur device**, on bascule en **sélection manuelle / QR / overlay 2D**. Ripcord pré-décidé = une feature AR coincée ne mange pas le week-end.

### Garde-fous / prérequis

- **Porte toolchain :** Expo dev build/EAS ou builds locaux, **Mac + Xcode**, Android Studio si build local, **iPhone physique + Android physique**.
- **Reference images :** images HD à plat (via **Rijks IIIF**) + **dimensions physiques** (du `dcterms:extent` EDM) → ViroReact utilise `physicalWidth`. Bon contraste = bon tracking.
- **Limite ~quelques images** trackées simultanément → on charge **par salle**, pas tout le catalogue.
- **Persistance :** intra-session seulement. Inter-session / VPS → **hors scope**.

---

## Flux de l'app (UX AR + audio guide + chat)
1. **Vue AR (entrée).** Caméra levée → **point bleu** sur l'œuvre détectée (ViroReact). Tap sur le point.
2. **Gros plan de l'œuvre.** L'œuvre passe en **vue détail (2D)** dans l'app. Dessus, des **hotspots pré-définis** (petits points) = aspects préparés de l'œuvre (ex. Night Watch : le geste du capitaine, la fillette-mascotte, l'usage de la lumière…).
3. **Audio guide (hotspots) = le wow démo.** Tap sur un hotspot → génère / lance l'audio
   **live au runtime** depuis `narration_text`. Contrôles : **vitesse**, **ton**,
   **voix** — changeables à la volée. `audio_url` n'est qu'un cache optionnel si la
   latence live casse le wow.
4. **Chat / questions libres.** Au-delà des hotspots : un **chatbot** permet de **poser des questions** et de **taper ailleurs que sur les points pré-définis** → réponse vocale/texte. **Barge-in = bonus** (M16) : montré si stable, sinon hors démo — le chat marche sans la coupure mid-phrase.
5. **Vision pitch (non développée).** End-game = **phone-less** : l'expérience sur **lunettes**, qui parle directement à l'utilisateur. *Shoot for the stars* — c'est pour le **pitch**, pas pour le build. Cf. [[1 — Stratégie & arène]] §Vision.

**Lecture archi :** la reco (ViroReact) ne sert qu'à l'étape 1–2. Les hotspots (étape 3) = **coordonnées sur une image d'œuvre déjà connue** → zéro vision, juste UI + déclenchement audio. Le chat (étape 4) = la couche voix conversationnelle.

## Stack week-end (à valider Siffrein)

- **Pipeline + backend** : **IntelliJ** (lane Adam). Recommandé **Python** (harvest/parse XML/images/LLM/Supabase) — tourne dans IntelliJ IDEA Ultimate (plugin Python) ou PyCharm ; alternative JVM/Kotlin si préféré.
- **Client démo** : **app mobile Expo React Native + ViroReact** dans `/app-mobile` (lane Siffrein). **PWA Next.js/Vercel** conservée pour paywall/secondaire (ou Base44 si on vise sa track).
- **Données** : **Rijksmuseum** — **OAI-PMH** (`https://data.rijksmuseum.nl/oai`, sans clé, format `edm`) + **IIIF** (`https://iiif.micr.io/{id}/...`). Set actuel : **`260214` Top 1000**.
- **Base** : **Supabase** (Postgres). Schéma = le contrat (voir ci-dessous).
- **Reconnaissance** : **ViroReact image tracking** (reference images générées depuis IIIF + dimensions EDM).
- **Voix** : **OUVERT** (ElevenLabs / Vapi — à trancher après recherche).
- **Paiement** : **Mollie** — paywall « débloquer le guide premium » (qualif headline + willingness-to-pay).
- **Builder kit** : Codex MAX, Devin MAX, Nebius 100$, Vapi 50$, Base44, HubSpot, Miro, Wispr Flow.

## Priorité de build (loi anti-débordement)

1. **Voix-phare** : parler à 1–2 œuvres hardcodées, barge-in. *Doit marcher en standalone.*
2. **Pipeline breadth** : ingestion Rijks (30 œuvres ou 300, la story d'échelle tient).
3. **Reconnaissance AR** : ViroReact (puis sélection/QR/overlay 2D). **Première chose qu'on coupe** si surcharge → QR + vidéo backup.

---

## Pipeline de données (lane Adam) — Rijksmuseum → Supabase

> Détail opérationnel + skeleton de projet : voir le **starter de pipeline** (repo `docs/`, hors Obsidian). Ici = la vue ground-truth.

### Endpoints vérifiés (20/06/2026)

- **OAI-PMH** : `https://data.rijksmuseum.nl/oai?verb=ListRecords&set=26021&metadataPrefix=edm` — **sans clé**, pagination par `resumptionToken` (50/page). Verbes : `ListSets`, `ListRecords`, `GetRecord`, `ListIdentifiers`.
- **Formats** : `edm` (riche : titres, descriptions EN+NL, créateur, `dcterms:extent` dimensions, sujets, CC0) · `oai_dc` (Dublin Core simple).
- **GetRecord Night Watch** : `...&verb=GetRecord&metadataPrefix=edm&identifier=https://id.rijksmuseum.nl/200107928` (objet `SK-C-5`).
- **IIIF Image** (Micrio) : `https://iiif.micr.io/{imageId}/info.json` (dimensions px) · `https://iiif.micr.io/{imageId}/full/max/0/default.png` (HD). L'`imageId` s'obtient via la représentation **Linked Art / CIDOC-CRM** de l'objet (résolveur `https://id.rijksmuseum.nl/{id}`).
- ⚠ **Note du 11/06/2026** : nouvelle version OAI-PMH (EDM validé Europeana) en déploiement → **parser défensivement** (ou consommer en graphe).

### Étapes

1. **Extraction (harvest).** `ListRecords` sur le set → parser l'EDM XML par objet : URI, `objectNumber`, titres (EN/NL), descriptions (EN/NL), créateur (URI), date, **extent**, sujets (URIs), rights. Récupérer l'**imageId IIIF** via la représentation Linked Art.
2. **Raffinement (clean + enrich).** Dédupliquer titres (l'EDM en a plusieurs), choisir EN+NL canoniques ; parser `extent` → `height_cm`/`width_cm` ; résoudre les URIs créateur/sujets → labels (nom artiste, mouvement, thèmes) ; filtrer (HD + CC0 + description riche) ; **télécharger les images HD** (IIIF) + générer la **reference image AR**.
3. **Transformation (graphe + notices neutres + hotspots).** Construire le graphe
   (Œuvre→Artiste→Mouvement→Musée) ; produire les **notices par source**
   (`rijks` → `ok`, `wikipedia` → `review`) sans LLM ; **auteur les hotspots** des
   phares (coords + aspect + texte) ; charger dans Supabase. Les angles de médiation
   sont des instructions runtime, pas des notices stockées.

### Schéma Supabase (le contrat — figé au SYNC 1)

```sql
artist   (id, name, birth_year, death_year)
movement (id, name, wikidata_qid)
museum   (id, name, city)
artwork  (id, object_number, title_en, title_nl, year,
          height_cm, width_cm,           -- pour tracking AR / ViroReact physicalWidth
          image_iiif_id, image_url, ref_image_url,
          artist_id, movement_id, museum_id, rights, wikidata_qid, tags jsonb)
notice   (id, artwork_id, lang, source, text, sources jsonb, groundedness)
          -- pas de facet ; 1 ligne par (œuvre × langue stockée × source)
hotspot  (id, artwork_id, x, y,          -- coords normalisées sur l'image
          title, aspect, narration_text,
          audio_url, duration_s, ord)    -- cache optionnel, pas rempli par le pipeline
```

> `app/` (Siffrein) **lit** ce schéma ; `pipeline/` (Adam) **écrit**. Une **mock DB** au schéma dès la 1ère heure débloque Siffrein. Pas d'embeddings au runtime (colonne `embedding` optionnelle pour la story scale, hors chemin critique).

---

### Multilingue & notes

- **Multilingue.** On garde la langue du musée / de la source scrapée et un pivot EN si
  nécessaire. L'EDM Rijks fournit déjà **EN + NL**. Le FR n'est pas stocké par défaut :
  l'output visiteur est généré au runtime par l'IA puis vocalisé par le TTS.
- **Dataset legacy (piège).** Le « Rijksmuseum Challenge 2014 » (~100k XML + descripteurs visuels Matlab précalculés) est **obsolète** : on utilise l'**OAI-PMH + IIIF actuels** (800k, plus riches, dimensions incluses). Reco set curé = ViroReact → **pas besoin de descripteurs visuels précalculés**.
- **Couche éditoriale musée** (voix institutionnelle, ex. Guernica au Reina Sofia) = **pitch only**, pas implémentée dans la démo.

## Équipe & lanes

| Qui | Lane |
|---|---|
| **Adam** (CEO **+ dev**) | **Moteur de données** (IntelliJ) : ingestion Rijks → notices neutres par source → graphe Supabase + hotspots. **+** lead SYNC, business + paywall Mollie + traction, **pitch**, networking jury/sponsors |
| **Siffrein** (CTO) | **Expérience temps réel** (`/app-mobile`) : Expo React Native + ViroReact + voix + session/chat + **déploiement** (+ PWA repli) |
| **Designer** (recrue) | **Composants UI** + UI/UX « doux sur le regard » + écrans démo + branding + visuel scène |

> Charge rééquilibrée : Siffrein n'est plus seul. **Nouveau risque = Adam double-casquette** → **temps pitch protégé** (dim. matin code-free) + Codex/Devin en assist + SYNC courts.

## Parallélisation — bosser à 2

- **Contrat = schéma Supabase** ci-dessus. **Figé au SYNC 1.**
- **Monorepo :** `/pipeline` (Adam, IntelliJ, écrit la DB) · `/app-mobile` (Siffrein, Expo React Native, lit la DB) · `/shared` (schéma/types) · `/ui` (designer).
- Git : branches courtes, merges fréquents. **Règle d'or :** le schéma est la seule surface partagée.
- Adam peuple une **mock DB** dès la 1ère heure → Siffrein build sans attendre le vrai pipeline.

## Repères Megathon (fixes)

- **Ven** : 17:30 kick-off + keynotes (Mollie, Base44, Vapi) · 19:00–20:30 pitch & team formation
- **Sam** : 11:30 **workshop Vapi** (Siffrein) · **12:30 Cala** (Adam) · 13:30 Devin · 19:00 foot NL×SE (break optionnel)
- **Dim** : 12:30 **pitch workshop** (Adam) · **15:00 DEADLINE** · 18:00 finale · 20:30 awards

---

## Timeline 45h (loop discuss ↔ build)

> Build : **ven. 18:00 → dim. 15:00**. Heures = Amsterdam (CEST). ⚠ **Adam arrive 19:00** (train). Rythme = **SYNC court → bloc de build → SYNC** (agendas dans [[3 — Playbook & questions ouvertes]]).

### Phase 0 — Pré-build · Ven 16:00–19:00 (Adam arrive 19:00)
- ⚠ **Adam dans le train** → prep P0 (cf. TODO §train) + **répète le pitch** + **scaffold le pipeline**.
- **Siffrein couvre l'on-site** : check-in, **builder kit**, reps Vapi/Mollie/Cala, table.
- **Prévenir les orgas** : Adam arrive 19:00, garder un slot de pitch.

### ⟐ SYNC 0 — Scoping par téléphone (~17:30–18:00, 20 min)
- Verrouiller **scope + lanes + front mobile Expo/ViroReact + tranche Rijks + 2 phares** avant l'atterrissage.

### Phase 1 — Recrutement & setup · Ven 19:00–20:30
- Adam arrive → check-in express → team formation → **pitcher** → **recruter le designer**.
- En //: comptes **Mollie / Vapi / Vercel**, repo monorepo, API Rijks, **porte toolchain AR** (Expo dev build/EAS + devices physiques).

### ⟐ SYNC 1 — Kickoff build (Ven ~20:45, 25 min)
- **Happy path écrit** + **schéma Supabase figé** (le contrat). Tâches bloc A + « done » de la nuit.

### Phase 2 — Bloc A (nuit) · Ven 21:00 → ~01:30 — **PRIORITÉ 1 : voix-phare**
- Adam : 1–2 **notices phares main** + **mock DB** au schéma → débloque Siffrein ; amorce ingestion Rijks.
- Siffrein : **spike voix** (parler ↔ répondre ↔ barge-in) sur notices mock + base app mobile.
- Designer : shell vue détail (écran œuvre + hotspots + chat) + direction visuelle.
- Cible : **on parle à 1 œuvre et ça répond.** (standalone)

### 😴 Sommeil 1 · ~01:30–07:30 (rotation possible)

### ⟐ SYNC 2 — Standup (Sam ~08:30, 15 min)
- État happy path. Bloqueurs. Plan du matin. Go/no-go pipeline.

### Phase 3 — Bloc B (matin) · Sam 09:00–14:30 — **PRIORITÉ 2 : pipeline breadth**
- Adam : **pipeline ingestion** Rijks (OAI-PMH + IIIF → graphe → notices auto ancrées). Workshop **Cala 12:30**.
- Siffrein : **workshop Vapi 11:30**, puis brancher l'app sur la **vraie DB** + **reference images AR** + paywall Mollie.
- Designer : polir écran œuvre, transitions, écran « scale » (N œuvres ingérées).

### ⟐ SYNC 3 — Intégration midi (Sam ~14:30, 20 min)
- **Premier bout-en-bout** : AR → œuvre → hotspot/voix → paywall. **Go/no-go ViroReact → fallback sélection/QR/overlay 2D si anchors instables.** Geler le périmètre ?

### Phase 4 — Bloc C (aprem/soir) · Sam 15:00–~00:30 — **PRIORITÉ 3 : reco (bonus) + polish**
- Adam : reconnaissance (ViroReact / sinon sélection-QR) + traction + **paiement réel (live) au stand**.
- Siffrein/designer : multilingue live (FR→EN), hotspots des phares, polish du wow.
- Adam : draft pitch finale + slides.

### ⟐ SYNC 4 — Dry-run (Sam ~19:30, 30 min — pendant le foot)
- Démo jouée en live, chrono. **Liste de coupes** (reco en 1er). Plan vidéo backup.

### Phase 5 — Bloc D (nuit→matin) · Sam 23:00 → Dim ~02:00
- Bug-fix happy path **uniquement**. **Vidéo backup** de la démo.

### 😴 Sommeil 2 · Dim ~02:00–07:30 — **à protéger** (pitch live le soir).

### ⟐ SYNC 5 — Feature freeze (Dim ~08:00, 15 min) — **Gel.** Polish + pitch only.

### Phase 6 — Finalisation · Dim 08:30–14:00
- Siffrein/designer : polish, stabilité, déploiement.
- Adam : **répétition pitch** ×N (code-free protégé), **pitch workshop 12:30**, Q/R jury.

### ⟐ SYNC 6 — Go/no-go submission (Dim ~14:00, 15 min) — **soumettre avant 15:00**.

### Phase 7 — Finale · Dim 18:00 — Pitch live. Adam lead, démo en appui.

### Règles de la boucle
1. **SYNC timeboxé** ; déborde → parking lot. 2. **Un seul happy path.** 3. **Priorité build = loi** (voix→pipeline→reco), on coupe par le bas. 4. **Le schéma est sacré.** 5. **Feature freeze dim. matin** + **vidéo backup** avant la nuit de samedi. 6. Le CEO **protège le temps**.

---

## TODO opérationnel

> ⚠ **Adam arrive 19:00** (train) → P0 dans le train.

### 🚆 Dans le train (maintenant)
- [ ] **Prévenir les orgas** : arrivée 19:00, garder un **slot de pitch**.
- [ ] **Caler avec Siffrein** : arrivée + check-in / builder kit / table. **SYNC 0 par tél** (~17:30).
- [ ] **Scaffold le projet pipeline** (IntelliJ) + **1er harvest** test sur set 26021 (cf. starter).
- [ ] Récupérer les **2 clés Mollie** (`test_…` / `live_…`).
- [ ] Créer comptes **Vapi**, **Vercel** ; **repo monorepo** (`/pipeline` · `/app-mobile` · `/shared` · `/ui`).
- [ ] **Pré-choisir la tranche Rijks + 2 phares** (Night Watch + La Laitière ?).
- [ ] **Répéter ×2-3 le pitch recrutement** (cf. [[3 — Playbook & questions ouvertes]]).
- [ ] **Vérifier la porte toolchain AR** : Expo dev build/EAS, Mac + Xcode, Android Studio si build local, iPhone + Android physiques.

### ✅ Déjà fait
- [x] **Compte Mollie créé** (banque, identité, CB + Apple/Google Pay) → **live actif**.

### 🧱 Build — Adam (pipeline, IntelliJ)
- [ ] **Scaffold projet** (modules harvest / refine / transform / load + `.env`).
- [ ] **Harvest** set 26021 (OAI-PMH `edm`) + parse + résoudre IIIF imageId.
- [ ] **Refine** : extent→cm, labels créateur/mouvement, download HD + ref image AR.
- [ ] **Transform** : graphe + **notices neutres par source** + **hotspots des phares**.
- [ ] **Mock DB** au schéma → débloque Siffrein tout de suite.

### 🎤 Build — Siffrein (app mobile Expo React Native)
- [ ] **Spike voix** (parler / répondre / barge-in) sur mock DB.
- [ ] **App mobile ViroReact** : détection œuvre (tracking targets) → point ancré → vue détail → hotspots. Fallback sélection/QR/overlay 2D prêt.
- [ ] **Audio hotspots** (lecteur + contrôles vitesse/ton/voix) + **chat** libre.
- [ ] Intégrer **paywall Mollie** (clé test → live au stand). **Déploiement**.

### 🎨 Build — Designer
- [ ] Vue détail (œuvre + hotspots + chat) + composants.
- [ ] Identité « doux sur le regard », transitions. Écran « scale » (N œuvres).

### 💼 Business / pitch (Adam)
- [ ] Paywall « premium » + **montant symbolique (1–3 €)**.
- [ ] **Paiement réel au stand** (clé live) → compter les **conversions €**.
- [ ] Plan **traction** (QR / signups). Draft **pitch finale** + slide de secours + **1 chiffre-choc**.
- [ ] **Build-in-Public** (poster la journey). **Vidéo backup** (avant nuit sam.). **Répéter le pitch** (dim. matin).

### 🏁 Dimanche
- [ ] **SYNC 5** freeze (08:00) · polish/deploy · **SYNC 6** go/no-go → **soumettre avant 15:00** · ordre de passage.

---

## 💳 Mollie — live actif : comment l'utiliser

**État :** compte créé, identité validée, banque liée, CB + Apple/Google Pay → **on peut encaisser pour de vrai.** ✅

- **`test_…` = dev + démo sur scène.** Paiements simulés, gratuit/répétable → on ne charge personne en répétition/pitch.
- **`live_…` = l'expérience au stand.** Vrais 1–3 € → compter les **conversions réelles** (signal willingness-to-pay + punchline). Bascule = changer la clé. **Jamais démoer en live sur scène.**

**Tips :** **hosted checkout** (Apple/Google Pay sans config domaine) · **webhook** pour débloquer le premium · montant 1–3 € · mini-CSV des conversions.
**Caveats :** payeurs = builders ≠ visiteurs (signal directionnel) ; euros sur l'entité perso (SIRET) ≠ laszlo → à réconcilier avec Siffrein.

<!-- maj : 2026-06-20 -->



---

## Mise à jour — session pipeline (2026-06-20 soir)

> Le pipeline de connaissance est **construit** (lane Adam, IntelliJ, Python). Détail technique faisant foi : repo `docs/data-model.md` + ADR 0002/0004/0007/0008/0011 (mis à jour). Résumé des changements vs le plan initial :

### Schéma Supabase révisé (le contrat)
```sql
artist   (id, name, birth_year, death_year, wikidata_qid)
movement (id, name, wikidata_qid)
museum   (id, name, city)
artwork  (id, object_number, title_en, title_nl, year, height_cm, width_cm,
          image_iiif_id, image_url, ref_image_url,
          artist_id, movement_id, museum_id, rights, wikidata_qid, tags jsonb)
notice   (id, artwork_id, lang, source, text, sources jsonb, groundedness)
          -- facet SUPPRIMÉ, source AJOUTÉ ; 1 ligne par (œuvre × lang × source)
hotspot  (id, artwork_id, x, y, title, aspect, narration_text, audio_url, duration_s, ord)
```

### Pipeline ETL médaillon (raw → enriched → refined → load), 100 % sans LLM
- **harvest** : OAI set **`26121`** (≠ `26021`, coquille) → `data/raw/*.xml` (747 œuvres, parser défensif).
- **enrich** : Wikidata (Q-id + mouvement + tags + sitelinks, pour toutes) + Wikipedia (extrait narratif, gate = article existant) → `data/enriched/*.json`.
- **refine** : dims cm, créateur Linked Art, IIIF imageId direct, filtre image+CC0 → `data/refined/*.json`.
- **transform** : graphe + notices par source (rijks `ok` / wikipedia `review`) + hotspots phares (main).
- **load** : upsert idempotent Supabase + reference images AR (rendition IIIF) en Storage, **œuvres trackées seulement**.
- CLI : `python -m pipeline.main {harvest|enrich|refine|transform|load|all} --set 26121 --limit N`.

### Décisions clés (cf. journal M18–M22 dans [[1 — Stratégie & arène]])
- **Notice = substrat neutre** ; angles de médiation = runtime (≠ stockage).
- **Découverte** : description Rijks courte (phare = 544 car.) + ~50 % vides → enrichissement Wikipedia **nécessaire**, pas optionnel.
- **Lecture app = PostgREST auto Supabase** (pas de FastAPI custom, pas de vue SQL).
- Reste : angles de médiation runtime, glossaire gradué, profil utilisateur neutre,
  génération runtime, TTS live, mémoire = sessions suivantes.



> **Correction corpus (20/06 soir)** : set `26121` → **`260214` (Top 1000, 1040 œuvres)**. Le `26121` excluait les phares + ~6 % couverture Wikipedia. Top 1000 inclut Night Watch + Laitière et a une forte couverture. Commande : `python -m pipeline.main all --set 260214`.
