---
tags: [projet/laszlo, megathon, type/sync, statut/clos]
date: 2026-06-20
---

# Contrat runtime/app — décisions actées (call clos)

> Call Siffrein × Adam **clos le 2026-06-20**. Le contrat complet (I/O des 3 endpoints,
> 4 modes, règles transverses) vit dans **[ADR 0014](../adr/0014-runtime-generation-edge-function.md)** —
> source de vérité, ne pas redupliquer ici. Ce doc = le **log des décisions**.

## Coupe orthogonale (qui possède quoi)

> Siffrein possède tout ce qui tient un secret ou tourne côté cloud.
> Adam/Codex possède tout ce que le visiteur voit et manipule.

| Surface | Owner |
|---|---|
| `/generate`, `/speak`, `/transcribe` (Edge Functions), clés LLM/STT/TTS, secrets, deploy | **Siffrein** |
| App : UI, AR point bleu, vue détail, hotspots, chat, lecteur audio, fallbacks | **Adam/Codex** |
| Session app : profil, langue, `history` capé, états du batch hotspot | **Adam/Codex** |
| Contenu phares : notices propres, coords hotspot, fallback narratif | **Adam (CEO)** |
| Démo/pitch : QR/posters, vidéo backup, offre Mollie, dry-run, script | **Adam (CEO)** |

## Décisions verrouillées

- **3 endpoints**, contrat I/O figé → ADR 0014. `ask` = SSE ; `hotspot`/`persona`/`followups` = JSON.
- **+2 amendements (validés Siffrein)** : `mode=persona` (call caché onboarding → `persona_summary`)
  et `mode=followups` (3 questions à la volée). Comblent les 2 oublis du draft initial.
- **Hotspots** = batch à l'entrée de l'œuvre, perso profil/langue + history (influence œuvre-à-œuvre),
  **pas recalculés dans une œuvre**. Fallback `narration_text` à **3 s**.
- **Voix server-side** : TTS = ElevenLabs (`/speak`), STT = Voxtral (`/transcribe`). L'app ne tient
  aucune clé provider, juste les contrôles de lecture.
- **LLM = TBD**, interface OpenAI-compatible (`base_url` + clé `.env`, fournis par Siffrein) → swap de config.
- **`history`** tenu app, capé 8 msg / 4 tours + `history_summary`. Runtime stateless.
- **`request_id`** app, réémis serveur. **`sources`** structuré.

## Rythme de dev

- Sprints autonomes **90 min** ; l'app avance sur **mocks conformes au contrat** si le serveur n'est pas prêt.
- Convergence en fin de sprint ; **convergence dure après 2 sprints max (3 h)** : app branchée sur
  endpoint serveur/stub réel ; le contrat ne bouge plus sans accord explicite.
- 1er livrable Siffrein accepté : vrai endpoint **ou** stub HTTP conforme **ou** fixtures `curl`.

## Reste à trancher (non bloquant)

- Modèle LLM concret (mini-éval qualité/latence) — `.env` fourni au moment venu.
- Hébergement de l'`audio_url` (`/speak`) : bucket Supabase Storage vs URL provider.
- Trimmer les notices Wikipedia phares (D3) — bloque le grounding `ask`/`followups`.
