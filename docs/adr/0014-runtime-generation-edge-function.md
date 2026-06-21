# ADR 0014 — Runtime de génération : Edge Function Supabase, mono-appel, voix server-side

**Statut :** Accepté · contrat figé 2026-06-20 (validé Siffrein × Adam)

## Contexte

La sortie visiteur est générée au runtime (cf. `data-model.md`) :

```text
output = f(notice, glossaire@niveau, préférences, langue, voix/TTS)
```

Ce `f()` n'existait dans aucun composant : ni le pipeline (s'arrête au substrat
neutre, par design), ni l'app mobile (lit les notices brutes via PostgREST), ni
un backend (il n'y en a pas — la lecture est PostgREST nu). Il fallait décider
**où vit `f()`**, **quelle forme** il prend, et **comment la voix s'y rattache**.

Faux postulats écartés en discussion :

- *« React impose un backend dédié »* — non. L'app RN parle à Supabase en direct
  (PostgREST + clé anon) pour les lectures et au provider voix en direct. Le seul
  job serveur est : **tenir la clé LLM** et **exécuter `f()`**. Le « back-end
  applicatif » et le « service IA » sont donc **le même composant**, pas deux.
- *« FastAPI économise de l'argent »* — non. L'hébergement est gratuit des deux
  côtés pour une démo (Edge Function free tier ; FastAPI local/Render gratuit).
  Le coût réel = **tokens LLM + caractères TTS**, identique quel que soit l'hôte.
  Le critère est donc la **robustesse + le nombre de pièces mobiles**, pas le coût.

## Décision

### 1. `f()` vit dans une **Edge Function Supabase**

Un seul endpoint, texte-pur, qui tient la clé LLM et lit les notices côté serveur.

- **URL publique HTTPS**, comme Supabase et le provider voix → même modèle de
  robustesse que les autres dépendances de l'app. Un FastAPI local au stand serait
  la *seule* pièce dépendante du réseau local du venue (mode de panne déjà flaggé).
- **Zéro déploiement séparé**, pas de box à garder vivante, secrets dans le vault
  Supabase, free tier suffisant pour la démo.
- **Bascule possible vers FastAPI** plus tard sans changer le contrat HTTP. La
  *seule* condition qui justifierait FastAPI dès maintenant : `f()` devient un
  agent multi-étapes, ou on veut tout le serveur en un repo Python. Aucun des deux
  n'est le cas (cf. point 2).

### 2. `f()` est **mono-appel LLM**, pas un agent multi-étapes

Le modèle de données est pensé pour ça (chemin chaud, ADR 0002) : l'œuvre est
**connue** (tapée), on injecte **toutes ses notices** d'un coup. Zéro décision de
retrieval, zéro tool-calling, zéro planification → **un prompt, un appel**.

- Le chat libre sur les phares = notices des 1-2 phares en contexte → réponse en un
  appel.
- Le multi-étapes ne sert qu'à l'**open-world** (œuvre hors set → retrieval), qui
  est explicitement **post-hackathon + story de pitch** (embeddings, « 60M œuvres »),
  pas le chemin de démo.
- Activement à éviter maintenant : la voix live est sensible à la latence ; chaque
  round-trip LLM ajoute 1-2 s. Un agent paierait complexité **et** wow.

### 3. La voix **encadre** le runtime texte→texte, mais **vit côté serveur**

Le runtime `generate` reste texte→texte. STT et TTS l'**encadrent** — et **tous deux sont
côté serveur**, derrière leurs propres edge functions, parce que leurs clés ne peuvent pas
plus vivre dans l'app que la clé LLM :

```text
parole → [/transcribe] → texte → /generate → texte → [/speak] → audio_url → lecture app
```

- **`/transcribe`** (STT, Voxtral) et **`/speak`** (TTS, ElevenLabs) tiennent leurs clés
  serveur. L'app n'appelle **jamais** ElevenLabs/Voxtral en direct (révise la version
  initiale « app parle au TTS directement » : elle exposait la clé).
- L'utilisateur « flemme de parler » saute les deux brackets — pas un cas spécial. Le
  **chemin texte ship en premier** ; l'app n'a que des **contrôles de lecture** (voix /
  vitesse / ton), pas de provider.
- On n'est **pas** dans le modèle Vapi-pilote-tout : Vapi serait au mieux un transport TTS
  derrière `/speak`, pas le cerveau. Révise la posture de l'ADR 0003 en ce sens.

## Contrat de l'Edge Function (surface app ↔ runtime) — figé 2026-06-20

**Trois endpoints**, auth = clé anon Supabase (header `Authorization`). Clés LLM/STT/TTS
**toutes côté serveur**. Le client envoie des IDs + préférences, **jamais les notices** : le
runtime relit le grounding (`notice`) server-side.

- `POST /functions/v1/generate` — texte. 5 `mode` : `overview`, `hotspot`, `ask`, `persona`, `followups`.
- `POST /functions/v1/speak` — texte → audio jouable (`audio_url`). TTS server-side.
- `POST /functions/v1/transcribe` — audio → texte. STT server-side.
- `POST /functions/v1/identify` — image → `artwork_id` (fallback vision si l'AR échoue). Clé vision server-side.

**Règles transverses :**

- `request_id` généré par l'app, **réémis** par le serveur (corrèle batch ↔ réponses).
- `history` **tenu par l'app** (runtime stateless), capé à **8 messages = 4 tours** ; au-delà,
  l'app envoie un `history_summary`. Chaque message porte un `artwork_id` (mémoire œuvre-à-œuvre).
- `sources` **structuré** : `{ source, lang, notice_id }`, pas une liste de strings.
- `mode=ask` = **SSE streamé** (`delta`/`done`/`error`) ; `hotspot`/`persona`/`followups`
  = **JSON final** (courts, pas de stream).
- `profile` = 3 axes neutres skippables (`motivation`/`knowledge`/`depth`) + `persona_summary` (produit par `mode=persona`) ;
  `steering` = re-steering live (`tone`). L'angle d'intérêt (lens) est **parqué** (futur power feature, hors démo).

### `mode=overview` — intro générale, à l'entrée de la vue œuvre

Génère **une présentation de l'œuvre dans son ensemble** : qui, quand, pourquoi ça compte.
Lancé **en parallèle** du batch `hotspot` à l'ouverture de la vue détail. Résultat affiché
immédiatement dans le **hotspot virtuel « ✦ L'œuvre »** (coin bas-gauche de l'image, violet,
non stocké en DB). Tap sur ✦ = retour à la présentation générale depuis n'importe quel hotspot.

```jsonc
// Request : idem hotspot sans hotspot_ids[], mode = "overview"
{
  "request_id": "uuid", "artwork_id": "uuid", "mode": "overview",
  "lang": "fr|en|nl",
  "profile": { ... },
  "steering": { ... },
  "history_summary": "string | null"
}
// Response
{ "type": "done", "request_id": "uuid", "text": "string", "sources": [ ... ] }
```

**Différence avec `mode=ask`** : overview ne prend pas de `question` ni d'`history` — c'est
un monologue d'ouverture, groundé sur toutes les notices, pas une réponse à une interaction.

### `mode=hotspot` — batch, à l'entrée de la vue œuvre

**Un seul appel** pour les N hotspots de l'œuvre, personnalisés profil/langue, conditionnés
par `history` (→ influence **œuvre-à-œuvre** : La Ronde de nuit tient compte de La Laitière).
Le tap ne déclenche **aucun** LLM : il lit le texte déjà prêt ; fallback `narration_text`
après **3 s**. Les hotspots ne sont **pas** recalculés à l'intérieur d'une même œuvre.

```jsonc
// Request
{
  "request_id": "uuid", "artwork_id": "uuid", "mode": "hotspot",
  "hotspot_ids": ["uuid"],
  "lang": "fr | en | nl",
  "profile": { "motivation": "contemplate|understand|stories", "knowledge": "newcomer|comfortable|expert",
               "depth": "quick|standard|deep", "free_text": "string | null",
               "persona_summary": "string | null", "kid": "bool (réservé, futur)" },
  "steering": { "tone": "string | null" },
  "history_summary": "string | null",
  "history": [ { "role": "user|assistant", "content": "string", "artwork_id": "uuid | null" } ]
}
// Response
{
  "type": "done", "request_id": "uuid",
  "items": [ { "hotspot_id": "uuid", "status": "ready | error", "text": "string | null",
               "message": "string | null",
               "sources": [ { "source": "rijks|wikipedia", "lang": "en|nl", "notice_id": "uuid|null" } ] } ]
}
```

### `mode=ask` — SSE, Q&A

chat libre · point placé `{x,y}` · conversation depuis un hotspot (grounding = texte hotspot
généré + notices).

```jsonc
// Request : idem hotspot, sans hotspot_ids[], avec :
{ "hotspot_id": "uuid | null", "point": { "x": 0.42, "y": 0.58 } | null, "question": "string", ... }
// SSE
data: {"type":"delta","request_id":"...","delta":"..."}
data: {"type":"done","request_id":"...","text":"...","sources":[{"source":"rijks","lang":"en","notice_id":"..."}]}
data: {"type":"error","request_id":"...","message":"..."}
```

### `mode=persona` — le call caché d'onboarding (S5)

Sélections onboarding → `persona_summary` (1 appel LLM, stocké device, réinjecté dans
`profile.persona_summary` à chaque appel suivant). C'est le « 15 s, Laszlo a construit mon profil ».

```jsonc
// Request
{ "request_id": "uuid", "mode": "persona", "lang": "fr|en|nl",
  "onboarding": { "motivation": "...", "knowledge": "...", "depth": "...", "free_text": "string|null" } }
// Response
{ "type": "done", "request_id": "uuid", "persona_summary": "string" }
```

### `mode=followups` — suggestions à la volée

À **chaque ouverture de hotspot** + après un tour de chat → 3 questions de suivi, basées sur
la session complète. Tap sur une suggestion → `mode=ask`.

```jsonc
// Request : artwork_id + hotspot_id|null (contexte) + profile/steering/history (idem ask)
{ "request_id": "uuid", "artwork_id": "uuid", "mode": "followups", "hotspot_id": "uuid|null", ... }
// Response
{ "type": "done", "request_id": "uuid", "questions": ["...","...","..."] }
```

> Micro-optim possible : piggyback `questions` dans le `done` de `mode=ask` (économise un
> round-trip côté chat). Gardé séparé pour l'instant — uniforme côté app.

### `POST /speak` — TTS server-side

`/generate` reste texte-only. `/speak` transforme le texte final en audio jouable. L'app ne
gère qu'une **URL courte** + ses contrôles de lecture (pas de base64, pas de provider).

```jsonc
// Request
{ "text": "string", "lang": "fr|en|nl", "voice": "default|warm|calm", "speed": 1, "tone": "calm|neutral|null" }
// Response
{ "audio_url": "https://...", "format": "mp3", "duration_s": 18.4 }
```

`voice` = intention stable, pas un `voice_id` provider brut (mapping ElevenLabs gardé serveur).
⚠ Flux **séquentiel** (`generate` complet → `speak` complet → lecture) : latence acceptée en
démo (textes courts) ; un flux HTTP jouable derrière la même `audio_url` reste possible plus tard.

### `POST /transcribe` — STT server-side

`multipart/form-data` (pas de base64). Max démo **20 s / 10 MB**. Bloquant avant `mode=ask`.

```jsonc
// Request : multipart { audio: file, lang_hint: "fr|en|nl|null" }
// Response
{ "text": "string", "lang": "fr|en|nl", "duration_s": 4.2 }
```

Flux voix complet : `audio → /transcribe → texte → /generate ask → texte → /speak → audio_url`.

### `POST /identify` — fallback vision (l'AR a échoué)

ViroReact fait reco + ancrage on-device sur le set curé. **S'il échoue**, l'app capture une
frame et la POST ici ; un **modèle de vision** (Claude, clé serveur) identifie **laquelle** des
œuvres candidates est en vue → l'app ouvre la même vue détail en overlay 2D.

- **Pas d'embeddings** (hors runtime, post-hackathon) : on envoie l'image **+ la liste des
  candidats** (œuvres déjà chargées pour la salle) → le modèle choisit. Mono-appel, set curé.
- `multipart/form-data` (comme `/transcribe`). Échelle de fallback : ViroReact → `/identify`
  → sélection manuelle / QR.

```jsonc
// Request : multipart { image: file, candidate_ids: ["uuid"] | null, lang_hint: "fr|en|nl|null" }
// Response
{
  "artwork_id": "uuid | null",   // null = pas de match confiant → app bascule QR/manuel
  "confidence": 0.0,
  "candidates": [ { "artwork_id": "uuid", "confidence": 0.0 } ] | null
}
```

## Modèle LLM & STT (détail providers — swappables, ADR 0012)

- **Modèle de `f()`** = **TBD**, derrière une interface **OpenAI-compatible** (`base_url`
  + clé en `.env`, fournis par Siffrein). Le provider est un **swap de config**, le contrat
  ne bouge pas. Candidat par défaut = modèle open hébergé (Nebius/crédits kit) ; Claude API
  en référence/fallback. ⚠ Un **abonnement Claude.ai ≠ clé API**.
- **Grounding par mode** : `hotspot` → notice `rijks` + `narration_text` écrit main (riche)
  + profil → génération courte en **batch** (N hotspots en 1 appel). `ask`/`followups` →
  ont besoin de **Wikipedia**, mais les notices wikipedia sont aujourd'hui un **dump brut**
  (trop gros) → **à trimmer** (cf. TODO D3) ou modèle plus fort.
- **STT = Voxtral**, cloud, derrière `POST /transcribe` (multipart, requête courte). Clé
  STT serveur. On-device écarté. Le STT **transcrit seulement**.
- **TTS = ElevenLabs**, derrière `POST /speak` (clé serveur). Principe : le **texte généré
  est l'artefact stable** ; changer voix/vitesse = **re-synthétiser** ce texte, l'audio est
  jetable. L'app reçoit une `audio_url` + ses contrôles de lecture.

## Topologie résultante

**Chemin de requête (3) :** App RN → **Runtime (Edge Function)** → Supabase
(PostgREST pour les lectures app, accès notice pour le runtime).
**Hors chemin (1) :** Pipeline = **batch offline** qui écrit Supabase puis meurt —
pas un service, pas déployé en continu.

→ **Pas de microservices.** 1 app + 1 runtime mince + 1 DB + 1 job offline.

## Conséquences

- (+) Le contrat HTTP ci-dessus débloque app et runtime **en parallèle** (comme le
  schéma Supabase débloque app et pipeline).
- (+) Chemin texte démontrable sans décision voix → plus gros dé-risquage.
- (+) Migration FastAPI ultérieure = même contrat, sans toucher l'app.
- (−) Edge Function = runtime Deno/TS (≠ Python du pipeline) ; aligné sur l'app (TS,
  types partagés) plutôt que sur le pipeline. Accepté : le runtime et le pipeline ne
  partagent quasi pas de code (l'un est chemin chaud, l'autre batch).
- (−) Streaming long / WebSocket peu adaptés aux Edge Functions — non bloquant
  puisque la voix (qui tiendrait les sockets) est une brique séparée.

## Sécurité — prompt injection

Le **mono-appel sans outils est une frontière de sécurité volontaire** : le runtime ne
fait que lire des notices (publiques, CC0) et appeler le LLM. Pas d'outils, pas d'écriture
DB, pas de données d'autrui, clé LLM hors prompt. → impact d'une injection = le modèle dit
une bêtise **dans la session de l'utilisateur**, pas de fuite ni d'escalade.

- `question` / `history` venant du client = même niveau de confiance (input utilisateur) ;
  `history` n'ajoute **pas** de surface vs `question`.
- **Vrai vecteur = les notices scrapées** (Wikipedia surtout) : contenu non maîtrisé injecté
  dans le prompt = injection **indirecte**. Recoupe le besoin de trimmer les notices (TODO D3).
- **Défense proportionnée (démo)** : instructions de grounding en `system`, notices délimitées
  (« réponds uniquement à partir de ces faits »), input utilisateur en `user`, `sources` dans
  la sortie. Pas de classifieur/sandbox = sur-engineering tant que le modèle n'a aucun pouvoir.
- **Redevient sérieux** si `/generate` gagne des outils ou devient un agent open-world avec
  retrieval → garder le mono-appel sans outils repousse ce risque.
