# Handoff — reprise dev (archi système posée)

> Point de reprise après la **session archi du 2026-06-20 soir** (Siffrein + agent) :
> on a arrêté de coder dans tous les sens et **posé l'architecture du système** —
> où vit la génération, la voix, l'identification. Lis d'abord **`docs/ONBOARDING.md`**
> (vue d'ensemble + carte repo + contrat) puis **`docs/adr/0014`** (le runtime). Ce doc
> dit **où on en est** et **quoi attaquer demain**.

## TL;DR de la session

On a fixé le **trou central** : la sortie visiteur `output = f(notice, glossaire,
profil, langue, voix)` n'existait nulle part. Décidé : **`f()` = Edge Function Supabase,
mono-appel, texte→texte** (ADR 0014). La **voix** et l'**identification** sont des briques
séparées qui encadrent ce runtime. **Pas de microservices.** Journal **M28–M33**.

## État actuel (vérifié)

**Couche Connaissance = en prod Supabase, lisible par l'app :**

- Projet `spbrkgoseabpsxzkkyzj` (UE). Corpus = set Rijks **`260214` Top 1000**.
- **1025 œuvres · 373 artistes · 7 mouvements · 1769 notices · 8 hotspots**.
- **Phares** : Night Watch `SK-C-5`, Laitière `SK-A-2344` (notices Wikipedia EN+NL +
  4 hotspots chacun, écrits main + ref image AR en Storage).
- Read path validé : `GET /rest/v1/artwork?object_number=eq.SK-C-5&select=*,notice(*),hotspot(*)` → OK.
- Storage public OK : `…/public/artworks/ref/SK-C-5.jpg` (200).

**App mobile = scaffold JETABLE et cassé** (à recâbler, pas à prolonger) :

- `App.tsx:7` importe `./src/data/demoArtworks` → **le fichier n'existe pas, l'app ne build pas**.
- `src/services/supabase.ts` crée un client Supabase **utilisé nulle part**.
- Tout l'app consomme déjà le type domaine `Artwork[]` (`src/domain/artwork.ts`) — il ne
  manque que **la source de données** (fetch Supabase → mapping domaine).

## L'architecture système (verrouillée ce soir)

```text
                IDENTIFICATION                 RUNTIME (texte→texte)
  caméra ─▶ ViroReact image tracking ─┐
            (reco + ancre couplés)     │   ┌── App lit artwork+hotspot (PostgREST, clé anon)
                  │ échec/hors-set      │   │
                  ▼                     ├──▶ App ─▶ POST /generate (Edge Function)
            capture flux ─▶ vision      │            │  lit notice server-side
            (Claude) = identité,        │            │  1 appel LLM (Nebius→Claude)
            position = overlay 2D ──────┘            ▼  stream SSE: texte + sources
                  │ échec                       texte adapté (niveau/langue/profil)
                  ▼
            manuel / QR

  VOIX (brique séparée, encadre le runtime) :
    parole ─▶ [STT Voxtral via POST /transcribe] ─▶ texte ─▶ /generate ─▶ texte ─▶ [TTS différé]
              └────── l'utilisateur "flemme de parler" entre/sort en texte ───────┘

  Hors chemin de requête : PIPELINE = batch offline (écrit Supabase puis meurt, pas un service)
```

**Contrat `/generate`** (surface app ↔ runtime, détail = ADR 0014) :
`POST /functions/v1/generate { artwork_id, mode: "hotspot"|"ask", hotspot_id|question,
lang, profile{motivation,knowledge,depth} } → text/event-stream (delta… + {done, sources})`.
Le runtime **relit les notices server-side** (jamais de grounding venu du client).

## Décisions verrouillées (journal M28–M33 + couche app)

| # | Décision |
|---|---|
| M28 | Runtime `f()` = **Edge Function Supabase** (≠ FastAPI, ≠ dans l'app). « Back app » et « service IA » = **le même composant**. Bascule FastAPI possible plus tard, même contrat. |
| M29 | `f()` = **mono-appel LLM**, pas d'agent multi-étapes (le modèle de données l'impose). Multi-étapes = open-world post-hackathon. |
| M30 | **Voix = brique séparée**, runtime texte→texte. Chemin **texte ship en premier**, décision voix ne bloque rien. |
| M31 | **Identification 2 étages** : ViroReact (reco+ancre couplés) → repli **vision Claude** (identité) + **overlay 2D** (position) → manuel/QR. |
| M32 | Modèle runtime = **open Nebius** (crédits kit) → **Claude API payant** en repli. ⚠ abonnement Claude.ai ≠ clé API. |
| M33 | **STT = Voxtral** via 2e edge function `/transcribe`. On-device écarté. STT transcrit, ne raisonne pas. |
| A1 | L'app **ne lit jamais `notice`** (seulement `artwork` + `hotspot`). Le grounding reste serveur. |
| A2 | App charge **par salle** ; démo = **phares only**. ViroReact = template-matching de features → distingue des œuvres différentes sans souci ; **vrai risque = reflet/vitre**, pas la confusion. |
| A3 | `location` (musée+galerie) → **hardcode phares** pour la démo, champ schéma à ajouter. |
| B2 | Hotspots = **pré-générés** à l'ouverture de l'œuvre ; **chat = génération temps réel**. |
| C1/C2 | Profil = **3 questions ludiques skippables** (`AsyncStorage`) ; langue = **picker visible**, init locale. |
| D2 | `niveau` = **instruction de prompt** seulement (table glossaire `term` inexistante) — assumé pour la démo. |
| D4 | **RLS lecture publique** pour la démo (clé anon lit tout), on sécurise après. |

## À résoudre demain (ne peut pas se défaulter)

1. **🟡 D1/M32 — modèle runtime** : tester un modèle sur **Nebius** (crédits kit). Si nul →
   mettre une **clé Claude API** (petit budget). *Bloque le choix du cerveau.*
2. **🟡 A3 — champ `location`** : ajout colonne schéma (**touche le contrat → Adam**) +
   hardcode des 2 phares (Galerie d'Honneur).
3. **D3 — trimmer les notices Wikipedia phares** : aujourd'hui dump brut, trop gros pour un
   petit modèle → **bloque le grounding du chat (`ask`)**. (Hotspots OK sans ça.)
4. **Design (avec le designer)** : wording des 3 questions onboarding (C1) + UI du chat (F2).

## Prochaines étapes concrètes (ordre)

1. **Recâbler l'app sur Supabase** (jeter `demoArtworks`) : `services/artworks.ts` =
   fetch `artwork?select=*,hotspot(*)&ref_image_url=not.is.null` → mapping domaine
   (subtitle = artiste+année via join, location = musée+galerie). Charger les phares.
2. **Brancher `/generate` sur tap hotspot** (stream). **Stopgap tant que `f()` pas prête** :
   afficher `narration_text` brut (= substrat, pas le texte final) — assumé temporaire.
3. **Écrire l'Edge Function `/generate`** (mono-appel, lit notice + hotspot, stream SSE).
4. **Onboarding 3 questions + picker langue** → alimentent `profile`/`lang`.
5. **Fallback vision** (capture → Claude vision → identité → overlay 2D).
6. **Brique voix** : `/transcribe` Voxtral, puis TTS (M15, en dernier).

## Garde-fous (ne pas se tromper)

- **`notice` = substrat neutre**, jamais le texte final. L'app **ne l'affiche pas** (sauf
  stopgap explicite). Le texte dit à l'utilisateur est **généré par `/generate`**.
- **L'app ne lit pas `notice`** ; elle envoie `artwork_id`, le runtime relit le grounding.
- **Pas de Claude gratuit via abonnement** : le runtime a besoin d'une clé API (Nebius ou Anthropic).
- **Voix ≠ cerveau** : STT transcrit seulement ; pas d'audio-natif tant que le LLM = Claude
  (Claude ne prend pas l'audio en entrée).
- **Clés** : app = clé **publishable** (anon, RLS lecture) ; clé **secrète** (écriture
  pipeline) **pas dans le repo** (`pipeline/.env` local, gitignored).

## Repo / git

- Commit `7212c91` (docs archi de cette session) est **fait localement sur `main`** mais
  **pas pushé** : `origin` = `aramz33/Laszlo-app`, `siffreinsg` n'a pas les droits d'écriture
  → Adam doit l'ajouter en collaborateur, puis `git push origin main`.
- Un **stash `autostash`** reste dans `git stash list` (backup du conflit de merge résolu) —
  à `git stash drop` une fois le push vérifié.

## Références (lire à la source)

- `docs/ONBOARDING.md` — vue d'ensemble, carte repo, contrat, comment l'app lit.
- `docs/adr/0014-runtime-generation-edge-function.md` — **le runtime** (décision + contrat).
- `docs/data-model.md` — le contrat data (schéma + 3 couches).
- `docs/megathon/0 — TODO directeur.md` — suivi des tâches. `1 — Stratégie & arène.md` —
  journal des décisions **M0–M33**. `pipeline/README.md` + `supabase/schema.sql`.
