# ADR 0014 — Runtime de génération : Edge Function Supabase, mono-appel, voix séparée

**Statut :** Accepté · 2026-06-20

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

### 3. La **voix est une brique séparée** ; le runtime reste texte→texte

Le runtime ne sait pas que la voix existe. STT et TTS l'**encadrent** :

```text
        ┌──── utilisateur texte-only entre/sort ici ────┐
        ↓                                                ↑
parole → [STT] → texte → RUNTIME f() → texte → [TTS] → parole
```

- L'utilisateur « flemme de parler » saute les deux brackets — pas un cas spécial.
- Le **chemin texte ship en premier**, sans aucun provider voix choisi. Le wow
  (« je tape un hotspot → texte adapté généré live ») marche sans voix.
- **La décision voix (M15 : Whisper / Voxtral / ElevenLabs) ne bloque plus rien**
  et se prend en dernier. On n'est **pas** dans le modèle Vapi-pilote-tout (Vapi
  veut être l'orchestrateur STT+LLM+TTS) : Vapi devient au mieux un transport TTS
  optionnel, pas le cerveau. Révise la posture de l'ADR 0003 en ce sens.

## Contrat de l'Edge Function (surface app ↔ runtime)

`POST /functions/v1/generate` · auth = clé anon Supabase (header `Authorization`).

**Entrée** (JSON) :

```jsonc
{
  "artwork_id": "uuid",          // l'œuvre ouverte ; le runtime relit ses notices server-side
  "mode": "hotspot" | "ask",
  "hotspot_id": "uuid | null",   // requis si mode = "hotspot" ; contexte possible si mode = "ask"
  "point": { "x": 0.42, "y": 0.58 } | null, // optionnel si mode = "ask" depuis un point libre
  "question": "string | null",   // requis si mode = "ask" (déjà STT si venu de la voix)
  "history": [                   // continuité conversation, tenue par l'app (runtime stateless)
    { "role": "user" | "assistant", "content": "string" }
  ],
  "lang": "fr",                  // langue de sortie visiteur
  "profile": {                   // les 3 cadrans neutres, tous skippables
    "allure": "court | moyen | long",
    "niveau": "decouverte | amateur | passionne",
    "interet": "string | null"   // angle de médiation runtime (texte libre, taxonomie non figée)
  }
}
```

- Le client envoie `artwork_id`, **pas** les notices : le grounding n'est jamais
  fait confiance depuis le client, le runtime relit la `notice` server-side (1 read
  indexé). Payload minuscule.
- `history` est **tenu par l'app** et renvoyé à chaque appel → le runtime reste
  **stateless** (modèle des API chat : le serveur ne mémorise rien). On évite une table
  `session` : l'historique = la conversation de l'utilisateur, pas des faits (les faits
  restent relus server-side). Token-cap aux N derniers tours si besoin. La **capture des
  intérêts dans le temps** (couche Profil/Mémoire) est hors scope ici.
- `mode=hotspot` génère le **texte personnalisé d'un hotspot** pour le profil courant.
  L'app lance ces appels **à l'entrée de la vue œuvre**, un par hotspot, en parallèle.
  Le tap hotspot ne déclenche pas de LLM : il lit le texte déjà généré, avec fallback
  possible sur `narration_text` si la génération n'est pas prête.
- `mode=ask` répond à `question` ancré sur les notices (+ contexte hotspot ou point
  placé par l'utilisateur).

**Sortie** : `text/event-stream` (streamé pour que le TTS commence à parler avant
la fin, et effet machine-à-écrire en texte-only).

```jsonc
data: {"delta": "..."}                       // tokens streamés
data: {"done": true, "sources": ["rijks","wikipedia"]}   // provenance = story anti-hallucination
```

## Révision 2026-06-20 — hotspots personnalisés à l'ouverture de l'œuvre

Amende le point 2 du contrat ci-dessus.

- **Les hotspots ancrés repassent par `f()`**, mais **pas au moment du tap**. À l'entrée
  dans la vue détail d'une œuvre, l'app lance en async les générations personnalisées :
  **un `POST /generate mode=hotspot` par hotspot**, en parallèle, avec `artwork_id`,
  `hotspot_id`, `lang`, `profile` et `history` court. Motif : le texte doit être unique
  au profil visiteur, mais le tap doit rester instantané.
- Au tap d'un hotspot, l'app affiche / vocalise le **texte personnalisé déjà prêt**.
  Fallback démo accepté : afficher `hotspot.narration_text` brut si la génération tarde.
- **`mode=ask` (streamé) couvre le Q&A** :
  - **chat libre** (question texte/voix) ;
  - **point placé par l'utilisateur** : tap sur un endroit arbitraire de l'œuvre (hors
    hotspots prédéfinis) + question → `point {x,y}` ajouté à l'entrée ;
  - **conversation à partir d'un hotspot ancré** : grounding = son texte personnalisé +
    les notices de l'œuvre.
- **Nom d'endpoint figé** : `POST /functions/v1/generate` pour `mode=hotspot` et
  `mode=ask`; `POST /functions/v1/transcribe` pour la voix→texte.

## Modèle LLM & STT (détail providers — swappables, ADR 0012)

- **Modèle de `f()`** = **modèle open hébergé sur Nebius** (crédits builder kit 100 $),
  **bascule Claude API payant** si la qualité est insuffisante. ⚠ Un **abonnement
  Claude.ai ≠ clé API** : il n'y a pas de Claude « gratuit via abonnement ». Le port LLM
  reste swappable, le contrat `/generate` ne bouge pas selon le modèle.
- **Grounding par mode** : `hotspot` → notice `rijks` + `narration_text` écrit main (riche)
  + profil courant → génération courte, parallélisée côté app. `ask` (chat) → a besoin de **Wikipedia**, mais les notices
  wikipedia sont aujourd'hui un **dump brut** (trop gros) → **à trimmer** (cf. TODO) ou
  passer sur un modèle plus fort.
- **STT = Voxtral**, cloud, derrière une **2e edge function `POST /transcribe`**
  (audio → texte ; requête courte, pas de socket long → l'Edge Function gère). Garde la clé
  STT serveur. STT on-device écarté (plus faible ; et le modèle de génération ne prend pas
  l'audio). Le STT **transcrit seulement**, il n'est pas le cerveau.
- **TTS** = clé côté serveur (même ownership que LLM/STT). Principe : le **texte généré
  est l'artefact stable** ; changer voix/vitesse à la volée = **re-synthétiser** ce même
  texte, l'audio est jetable. La forme exacte côté app reste à figer : stream audio,
  URL courte jouable, ou endpoint serveur dédié.

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
