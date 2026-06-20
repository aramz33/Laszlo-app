---
tags: [projet/laszlo, megathon, type/sync, statut/actif]
date: 2026-06-20
---

# Notes discussion Siffrein — contrat runtime/app

## Objectif du call

Sortir du call avec une coupe **orthogonale** et un contrat stable :

- **Siffrein** peut construire le serveur/runtime sans attendre l'app.
- **Adam/Codex** peut construire l'app sans toucher aux secrets ni au serveur.
- Les deux lanes se rejoignent uniquement sur : **payload `/generate`**, **format SSE**,
  **surface TTS**, **types partagés**.

Phrase d'ouverture :

> Le design a figé le happy path. Le but maintenant n'est pas de rediscuter le produit,
> mais de figer l'interface app ↔ runtime pour qu'on avance en parallèle sans se marcher
> dessus.

## Décisions déjà actées

- Endpoint texte : `POST /functions/v1/generate`.
- Modes de génération :
  - `mode=hotspot` : texte personnalisé d'un hotspot.
  - `mode=ask` : chat libre, question depuis hotspot, ou question sur point libre.
- Endpoint voix→texte : `POST /functions/v1/transcribe`.
- Les clés LLM / STT / TTS restent **côté serveur**.
- Le client envoie des IDs et préférences, **jamais les notices complètes**.
- Le runtime relit le grounding côté Supabase.
- Le serveur reste stateless ; l'app renvoie un `history` capé.
- Le tap hotspot ne déclenche pas le LLM : les textes hotspot sont générés **à l'entrée
  de la vue œuvre**, en parallèle.

## Point clé à faire valider

Le changement important :

> Les hotspots ne sont pas du texte fixe. Quand l'utilisateur entre dans une œuvre,
> l'app lance un `/generate mode=hotspot` par hotspot, en parallèle, avec le profil et la
> langue courants. Le tap lit le texte déjà prêt. Si ce n'est pas prêt, fallback sur
> `narration_text`.

Ce modèle garde les deux contraintes :

- personnalisation réelle par utilisateur ;
- interaction hotspot instantanée au tap.

## Répartition de propriété

| Surface | Owner | Done démo |
|---|---|---|
| `/generate` | Siffrein | modes `hotspot` + `ask`, SSE, grounding Supabase, clé LLM serveur |
| `/transcribe` | Siffrein | audio → texte, clé STT serveur |
| TTS serveur | Siffrein | texte → audio jouable, clé TTS serveur |
| App mobile | Adam/Codex | UI, AR point bleu, vue détail, hotspots, chat, lecteur audio, fallbacks |
| Session app | Adam/Codex | profil, langue, history capé, parallélisation hotspot |
| Contenu phares | Adam CEO | notices propres, coords hotspot vérifiées, fallback narratif acceptable |
| Démo/pitch | Adam CEO | QR/posters, vidéo backup, offre Mollie, dry-run, script |

Conclusion à faire confirmer :

> Siffrein possède tout ce qui tient un secret ou tourne côté cloud. Adam/Codex possède
> tout ce que le visiteur voit et manipule.

## Contrat `/generate` à figer

### Request proposé

```jsonc
{
  "artwork_id": "uuid",
  "mode": "hotspot | ask",
  "hotspot_id": "uuid | null",
  "point": { "x": 0.42, "y": 0.58 } | null,
  "question": "string | null",
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
  "history": [
    { "role": "user | assistant", "content": "string", "artwork_id": "uuid | null" }
  ]
}
```

### Response SSE proposé

```text
data: {"type":"delta","request_id":"...","delta":"..."}
data: {"type":"done","request_id":"...","text":"...","sources":["rijks","wikipedia"]}
data: {"type":"error","request_id":"...","message":"..."}
```

À décider avec Siffrein :

- Est-ce que `mode=hotspot` stream aussi, ou retourne un JSON final simple ?
- Est-ce que le serveur renvoie toujours `text` complet dans l'event `done` ?
- Est-ce qu'on inclut `request_id` côté app pour gérer les appels parallèles ?
- Quelle limite de `history` : 4 derniers tours ? 8 ?
- Est-ce que `sources` est simple (`["rijks"]`) ou structuré (`[{source, lang}]`) ?

## Hotspots : états app attendus

Quand l'utilisateur ouvre une œuvre :

1. App affiche image + points hotspot immédiatement.
2. App lance N appels `/generate mode=hotspot` en parallèle.
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

Question à trancher :

- Timeout fallback hotspot : 2 s, 3 s, ou 5 s ?

Reco CEO : **3 s max** pour la démo.

## Surface TTS à figer

Comme les clés TTS restent serveur, l'app ne doit pas appeler ElevenLabs/Vapi directement.

Options :

1. **Endpoint dédié `/speak`**
   Request : `text`, `lang`, `voice_id`, `speed`, `tone`.
   Response : audio stream ou URL courte jouable.
   Reco : le plus propre pour l'app.

2. **TTS inclus dans `/generate`**
   Le serveur génère texte + audio.
   Risque : moins flexible quand l'utilisateur change voix/vitesse après coup.

Décision à obtenir :

- Est-ce qu'on ajoute `POST /functions/v1/speak` ?
- Format audio attendu par React Native : URL, base64, stream ?
- Qui choisit `voice_id` par défaut ?

## Surface `/transcribe`

À figer rapidement :

```jsonc
{
  "audio": "file/blob/base64",
  "lang_hint": "fr | en | nl | null"
}
```

Response :

```jsonc
{
  "text": "string",
  "lang": "fr"
}
```

Décisions :

- L'app envoie quel format audio depuis Expo ?
- Taille max / durée max ?
- Est-ce que la transcription est bloquante avant `/generate`, ou affichée comme texte
  éditable ?

Reco CEO : transcription d'abord, puis `/generate` texte. Pas d'orchestration voix complexe.

## Coverage check jusqu'à la démo

### Happy path minimal

1. Onboarding rapide → profil + langue.
2. AR trouve l'œuvre ou fallback QR/manual.
3. Vue détail s'ouvre.
4. Hotspots se personnalisent en parallèle.
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

## Risques et décisions CEO

| Risque | Décision à prendre |
|---|---|
| Trop de latence hotspot | Génération parallèle à l'entrée + fallback 3 s |
| Contrat SSE flou | Figer `delta/done/error` maintenant |
| TTS bloque l'app | Choisir `/speak` ou URL audio maintenant |
| Siffrein déborde runtime + voix | Couper barge-in, garder texte d'abord |
| App bloque sur AR | QR/manual fallback prioritaire |
| Grounding chat trop gros | Trimmer les notices Wikipedia phares ou forcer modèle plus fort |

## Questions à poser à Siffrein

1. Tu valides que tu prends **tout serveur/secrets/deploy** : `/generate`, `/transcribe`,
   TTS, env vars, Supabase Edge Functions ?
2. Tu préfères quel format de réponse pour `/generate` : SSE partout ou JSON pour hotspot ?
3. Pour les appels hotspot parallèles, tu veux un `request_id` côté client ?
4. TTS : endpoint dédié `/speak`, ou inclus ailleurs ?
5. Quel provider TTS pour la démo : ElevenLabs direct serveur, Vapi, autre ?
6. Quel modèle LLM tu veux tester en premier : Nebius, Mistral, Claude fallback ?
7. Quel format audio Expo t'arrange pour `/transcribe` ?
8. Qu'est-ce que tu peux livrer en stub dans la première heure ?

## Décisions à logger après le call

- Contrat final `/generate`.
- Format SSE.
- Surface TTS.
- Timeout fallback hotspot.
- Provider LLM/TTS/STT de première implémentation.
- Env vars serveur.
- Qui crée les fixtures de test.

## Closing checklist

Avant de finir le call, obtenir un oui/non clair :

- [ ] Payload `/generate` validé.
- [ ] Events SSE validés.
- [ ] Surface TTS validée.
- [ ] `/transcribe` format validé.
- [ ] Siffrein a son premier done : endpoint stub déployable.
- [ ] Adam/Codex a son premier done : app appelle stub + gère états hotspot.
- [ ] Prochain checkpoint fixé.
