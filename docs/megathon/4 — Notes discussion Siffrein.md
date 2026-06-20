---
tags: [projet/laszlo, megathon, type/sync, statut/actif]
date: 2026-06-20
---

# Notes discussion Siffrein — contrat runtime/app

## Objectif du call

Sortir du call avec une coupe **orthogonale** et un contrat stable :

- **Siffrein** peut construire le serveur/runtime sans attendre l'app.
- **Adam/Codex** peut construire l'app sans toucher aux secrets ni au serveur.
- Les deux lanes se rejoignent uniquement sur : **payload `/generate`**, **format de
  réponse `/generate`**, **surface TTS/STT**, **types partagés**.

Phrase d'ouverture :

> Le design a figé le happy path. Le but maintenant n'est pas de rediscuter le produit,
> mais de figer l'interface app ↔ runtime pour qu'on avance en parallèle sans se marcher
> dessus.

## Décisions déjà actées

- Endpoint texte : `POST /functions/v1/generate`.
- Modes de génération :
  - `mode=hotspot` : batch de textes personnalisés pour les hotspots de l'œuvre.
  - `mode=ask` : chat libre, question depuis hotspot, ou question sur point libre.
- Endpoint voix→texte : `POST /functions/v1/transcribe`.
- Endpoint texte→audio : `POST /functions/v1/speak`.
- TTS démo : **ElevenLabs** côté serveur.
- STT démo : **Voxtral** côté serveur.
- LLM : **TBD**, à choisir après le premier test/stub du runtime texte.
- Les clés LLM / STT / TTS restent **côté serveur**.
- Le client envoie des IDs et préférences, **jamais les notices complètes**.
- Le runtime relit le grounding côté Supabase.
- Le serveur reste stateless ; l'app renvoie un `history` capé.
- Le tap hotspot ne déclenche pas le LLM : les textes hotspot sont générés **à l'entrée
  de la vue œuvre**, en batch.
- `/generate` reste texte-only ; `/speak` transforme le texte final en URL audio jouable.

## Point clé à faire valider

Le changement important :

> Les hotspots ne sont pas du texte fixe. Quand l'utilisateur entre dans une œuvre,
> l'app lance un `/generate mode=hotspot` en batch pour tous les hotspots visibles, avec
> le profil et la langue courants. Le tap lit le texte déjà prêt. Si ce n'est pas prêt,
> fallback sur `narration_text`.

Ce modèle garde les deux contraintes :

- personnalisation réelle par utilisateur ;
- interaction hotspot instantanée au tap.

## Répartition de propriété

| Surface | Owner | Done démo |
|---|---|---|
| `/generate` | Siffrein | `ask` SSE + `hotspot` JSON batch, grounding Supabase, clé LLM serveur |
| `/transcribe` | Siffrein | audio → texte, clé STT serveur |
| `/speak` | Siffrein | texte → audio jouable, clé TTS serveur |
| App mobile | Adam/Codex | UI, AR point bleu, vue détail, hotspots, chat, lecteur audio, fallbacks |
| Session app | Adam/Codex | profil, langue, history capé, états du batch hotspot |
| Contenu phares | Adam CEO | notices propres, coords hotspot vérifiées, fallback narratif acceptable |
| Démo/pitch | Adam CEO | QR/posters, vidéo backup, offre Mollie, dry-run, script |

Conclusion à faire confirmer :

> Siffrein possède tout ce qui tient un secret ou tourne côté cloud. Adam/Codex possède
> tout ce que le visiteur voit et manipule.

## Contrat `/generate` figé pour démarrer

### Règles

- `mode=ask` : réponse **SSE streamée** (`delta`, `done`, `error`).
- `mode=hotspot` : réponse **JSON finale simple**, pas de `delta`, pas de streaming.
- `mode=hotspot` est un **batch** : une requête contient les N hotspots de l'œuvre.
- `request_id` est généré côté app et réémis par le serveur.
- Pour `mode=ask`, l'event `done` renvoie toujours le `text` complet.
- `sources` est structuré, pas une simple liste de strings.
- `history` est capé côté app à **8 messages max** (= 4 tours user/assistant). Si la
  session dépasse ce cap, l'app envoie un `history_summary`; si la compaction n'est pas
  prête, elle garde simplement les 8 derniers messages.

### Request `mode=hotspot`

```jsonc
{
  "request_id": "uuid",
  "artwork_id": "uuid",
  "mode": "hotspot",
  "hotspot_ids": ["uuid"],
  "lang": "fr | en | nl",
  "profile": {
    "allure": "court | moyen | long",
    "niveau": "decouverte | amateur | passionne",
    "interets": ["technique", "people"],
    "free_text": "string | null",
    "persona_summary": "string | null"
  },
  "steering": {
    "tone": "string | null",
    "lens": "technique | people | stories | symbols | null"
  },
  "history_summary": "string | null",
  "history": [
    { "role": "user | assistant", "content": "string", "artwork_id": "uuid | null" }
  ]
}
```

### Response `mode=hotspot`

```jsonc
{
  "type": "done",
  "request_id": "uuid",
  "items": [
    {
      "hotspot_id": "uuid",
      "status": "ready | error",
      "text": "string | null",
      "message": "string | null",
      "sources": [
        { "source": "rijks | wikipedia", "lang": "en | nl", "notice_id": "uuid | null" }
      ]
    }
  ]
}
```

### Request `mode=ask`

```jsonc
{
  "request_id": "uuid",
  "artwork_id": "uuid",
  "mode": "ask",
  "hotspot_id": "uuid | null",
  "point": { "x": 0.42, "y": 0.58 } | null,
  "question": "string",
  "lang": "fr | en | nl",
  "profile": {
    "allure": "court | moyen | long",
    "niveau": "decouverte | amateur | passionne",
    "interets": ["technique", "people"],
    "free_text": "string | null",
    "persona_summary": "string | null"
  },
  "steering": {
    "tone": "string | null",
    "lens": "technique | people | stories | symbols | null"
  },
  "history_summary": "string | null",
  "history": [
    { "role": "user | assistant", "content": "string", "artwork_id": "uuid | null" }
  ]
}
```

### Response SSE `mode=ask`

```text
data: {"type":"delta","request_id":"...","delta":"..."}
data: {"type":"done","request_id":"...","text":"...","sources":[{"source":"rijks","lang":"en","notice_id":"..."}]}
data: {"type":"error","request_id":"...","message":"..."}
```

## Hotspots : états app attendus

Quand l'utilisateur ouvre une œuvre :

1. App affiche image + points hotspot immédiatement.
2. App lance 1 appel batch `/generate mode=hotspot` avec les N hotspots.
3. Chaque hotspot a un état :
   - `idle`
   - `loading`
   - `ready`
   - `fallback`
   - `error`
4. Tap hotspot :
   - si `ready` : lire texte personnalisé ;
   - si `loading` trop long : afficher/lire `narration_text` ;
   - si `error` : `narration_text` + UI discrète.

Décision timeout démo : **3 s max**. Si le batch n'a pas répondu au bout de 3 s,
l'app passe les hotspots en `fallback`, lit `narration_text`, puis peut remplacer
silencieusement par le texte personnalisé si la réponse arrive ensuite.


## Surface TTS figée

Comme les clés TTS restent serveur, l'app ne doit pas appeler ElevenLabs/Vapi directement.

Décision :

- Ajouter `POST /functions/v1/speak`.
- Garder `/generate` **texte-only** : il produit l'artefact stable `text`.
- `/speak` transforme ce texte en audio jouable.
- L'app reçoit une **URL courte jouable** (`audio_url`), idéalement MP3/M4A.
- Pas de base64 dans le contrat app.
- Pas de TTS inclus dans `/generate`.
- Le serveur choisit la voix par défaut et garde le mapping provider
  (ElevenLabs/Vapi/etc.) côté serveur.
- L'app peut envoyer une intention de voix stable (`voice`), pas un `voice_id`
  provider brut comme contrat produit.

Request proposé :

```jsonc
{
  "text": "string",
  "lang": "fr | en | nl",
  "voice": "default | warm | calm",
  "speed": 1,
  "tone": "calm | neutral | null"
}
```

Response proposé :

```jsonc
{
  "audio_url": "https://...",
  "format": "mp3",
  "duration_s": 18.4
}
```

Note : si le provider permet un flux HTTP directement jouable, il peut être exposé
derrière la même `audio_url`. Le contrat app reste URL jouable, pas gestion de stream
bas niveau.

## Surface `/transcribe` figée pour démarrer

Décision :

- Ajouter `POST /functions/v1/transcribe`.
- Request en `multipart/form-data`, pas en base64.
- L'app enregistre l'audio avec Expo, récupère une URI locale, puis upload le fichier.
- Durée max démo : **20 s**.
- Taille max démo : **10 MB**.
- La transcription est bloquante avant `/generate` : l'app attend le texte, puis appelle
  `/generate mode=ask`.
- Si l'UI est prête, afficher le transcript comme texte éditable avant envoi ; sinon
  auto-envoyer après transcription pour le happy path.

Request proposé :

```jsonc
{
  "audio": "multipart file field",
  "lang_hint": "fr | en | nl | null"
}
```

Response :

```jsonc
{
  "text": "string",
  "lang": "fr | en | nl",
  "duration_s": 4.2
}
```

Note : pas d'orchestration voix complexe. Le flux reste :

```text
audio app -> /transcribe -> texte -> /generate mode=ask -> texte -> /speak -> audio_url
```

## Coverage check jusqu'à la démo

### Happy path minimal

1. Onboarding rapide → profil + langue.
2. AR trouve l'œuvre ou fallback QR/manual.
3. Vue détail s'ouvre.
4. Hotspots se personnalisent en batch.
5. Tap hotspot → texte + audio.
6. Question libre texte/voix → `/generate mode=ask`.
7. Point libre sur l'image + question → `/generate mode=ask` avec `point`.
8. Switch langue → prochaine génération dans la nouvelle langue.
9. Fallback prêt si AR ou génération lente.

### Ce qui couvre la démo

- App peut tourner avec serveur réel.
- App peut tourner avec stubs si serveur pas prêt.
- Serveur peut être testé avec `curl` fixtures si app pas prête.
- Hotspots ont fallback local.
- QR/manual fallback ouvre la même vue détail.
- Vidéo backup existe avant la nuit.

## Rythme de dev app/serveur

Objectif : Adam/Codex avance sur l'app sans attendre Siffrein, et Siffrein avance sur
le serveur sans attendre l'app. On ne converge que sur le contrat.

Décision de rythme :

- **Sprint autonome court : 90 min.**
- Pendant le sprint, l'app utilise des mocks locaux conformes au contrat :
  - mock `/generate mode=hotspot` JSON batch ;
  - mock `/generate mode=ask` SSE ou simulation de `delta/done` ;
  - mock `/speak` avec une URL audio fixe ;
  - mock `/transcribe` avec un transcript fixe.
- Siffrein peut livrer soit de vrais endpoints, soit un endpoint stub HTTP qui respecte
  le contrat. L'app ne l'attend pas pour construire les écrans/états.
- **Convergence obligatoire à la fin de chaque sprint de 90 min** : 10-15 min pour tester
  app ↔ serveur/stub sur le contrat.
- **Convergence dure après 2 sprints max (3 h)** : l'app doit appeler au moins un endpoint
  serveur/stub réel. Si le serveur n'est pas prêt, l'app continue sur mocks mais le contrat
  ne bouge plus sans accord explicite.
- On ne bloque l'app que si le contrat change ou si une hypothèse de payload est impossible
  côté serveur.

Premier objectif de convergence :

1. App ouvre une œuvre et affiche hotspots depuis DB/mock.
2. App appelle `mode=hotspot` batch ou mock conforme.
3. App gère `loading` → `ready` / `fallback`.
4. App peut envoyer une question `mode=ask` contre stub ou simulation SSE.

## Risques et décisions CEO

| Risque | Décision à prendre |
|---|---|
| Trop de latence hotspot | Batch à l'entrée + fallback 3 s |
| Contrat `/generate` flou | `ask` = SSE ; `hotspot` = JSON batch |
| TTS bloque l'app | `/speak` dédié + URL audio jouable |
| Siffrein déborde runtime + voix | Couper barge-in, garder texte d'abord |
| App bloque sur AR | QR/manual fallback prioritaire |
| Grounding chat trop gros | Trimmer les notices Wikipedia phares ou forcer modèle plus fort |
| Attente passive entre lanes | Sprints autonomes 90 min + convergence obligatoire |

## Questions à poser à Siffrein

1. Tu valides que tu prends **tout serveur/secrets/deploy** : `/generate`, `/transcribe`,
   TTS, env vars, Supabase Edge Functions ?
2. Tu valides `/generate` comme contrat de démarrage : `ask` en SSE, `hotspot` en JSON
   batch, `request_id` réémis, `sources` structurées ?
3. Tu valides `/speak` dédié : request texte + voix abstraite, response `audio_url` ?
4. Tu valides `/transcribe` en `multipart/form-data`, max 20 s / 10 MB ?
5. Tu confirmes TTS = **ElevenLabs** côté serveur pour la démo ?
6. Tu confirmes STT = **Voxtral** côté serveur pour la démo ?
7. Quel modèle LLM tu veux tester en premier ? **TBD accepté** tant que le contrat reste
   stable et qu'un stub permet à l'app d'avancer.
8. Tu peux livrer quoi pour la première convergence de 90 min : vrai endpoint, stub HTTP,
   ou fixtures `curl` ?

## Décisions à logger après le call

- Contrat final `/generate`.
- Format `/generate` : `ask` SSE, `hotspot` JSON batch.
- Surface TTS.
- Surface `/transcribe`.
- Timeout fallback hotspot : 3 s.
- Providers de première implémentation : TTS = ElevenLabs ; STT = Voxtral ; LLM = TBD.
- Rythme de convergence : sprint autonome 90 min, convergence dure après 2 sprints max.
- Env vars serveur.
- Qui crée les fixtures de test.

## Closing checklist

Avant de finir le call, obtenir un oui/non clair :

- [ ] Payload `/generate` validé.
- [ ] Response `ask` SSE validée.
- [ ] Response `hotspot` JSON batch validée.
- [ ] Surface TTS validée.
- [ ] `/transcribe` format validé.
- [ ] Provider TTS ElevenLabs validé.
- [ ] Provider STT Voxtral validé.
- [ ] Rythme 90 min + convergence dure 3 h validé.
- [ ] Siffrein a son premier done : endpoint réel, stub HTTP, ou fixtures `curl`.
- [ ] Adam/Codex a son premier done : app appelle stub + gère états hotspot.
- [ ] Prochain checkpoint fixé.
