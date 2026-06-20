# ADR 0012 — Sélection des fournisseurs IA (direction + shortlists)

**Statut :** Direction acceptée · choix finaux **gated par l'éval empirique** (cf. `docs/eval/`) · 2026-06-15

## Contexte

Sondage marché des 5 ports IA (5 sous-agents, données juin 2026 — voir wiki `Fournisseurs IA`). Direction fondateur : **maximiser la résidence UE ET le coût**. Conséquence : privilégier le **self-host open + Mistral (API UE)** ; écarter par défaut les options US (Voyage, ElevenLabs hors plafond, OpenAI) et les hébergements CN en accès API (Qwen/DeepSeek → self-host UE seulement).

## Décision de direction

1. **Résidence UE + coût = critères filtrants** sur tous les ports. Ordre de préférence : self-host open (UE, coût marginal ~0) > API UE souveraine (Mistral) > API avec région UE contractuelle (Cohere via Bedrock EU) > US/CN (rejeté par défaut).
2. **Aucun fournisseur n'est figé tant que le harnais d'éval n'a pas tranché** sur données réelles. Chaque candidat = un adaptateur de port ; le harnais produit un scorecard comparable.
3. Le **harnais d'éval est l'artefact durable** ; les fournisseurs sont swappables derrière les ports hexagonaux (ADR 0001). Les modèles changent vite (Gemini 2.5→3.5 en mois) → on ne se lie pas, on mesure et on remplace.

## Shortlists (filtrées UE + coût) — statut "candidat, à confirmer par éval"

| Port | Candidats (ordre de préférence UE+coût) | Plafond qualité (repère hors UE) |
|---|---|---|
| **LLM chaud** | Mistral Large 3 (API UE) · Ministral 3 (edge self-host) · Gemini 3.5 Flash (région EU, gouvernance US — challenger coût/caching) | — |
| **LLM notices** | Qwen3 / Mistral self-host (UE, ~0 coût) · Mistral Large 3 API · Gemini 3.1 Pro | — |
| **STT** | Apple SpeechAnalyzer (iOS, local) · Voxtral 3B self-host + context biasing (local) · Voxtral Realtime API (UE) en secours | AssemblyAI/Deepgram (barge-in extrême, US — repère) |
| **TTS** | Cartesia self-host/on-device (US société mais self-host neutralise la résidence) · Voxtral TTS self-host (UE — **licence CC BY-NC à lever pour commercial**) | ElevenLabs EU Enterprise (qualité/langues max) |
| **Embeddings texte** | BGE-M3 self-host (UE, hybride dense+sparse, ~0 coût) · Qwen3-Embedding self-host (UE) · Cohere Embed v4 (région EU via Bedrock) | Voyage-3.5 (US — repère qualité/coût) |
| **Vision** | embeddings image self-host + pgvector : SigLIP 2 (serveur) → MobileCLIP2 / DINOv3 (on-device lunettes) · LLM multimodal en **repli** : Pixtral (UE self-host) ou Gemini EU | — |

## Options considérées (registre — réactivables)

Écartées par la direction UE+coût, conservées : Voyage-3.5 (US, meilleur embedding), ElevenLabs (US/Enterprise pour UE), OpenAI GPT/TTS (US), Qwen/DeepSeek en accès API (CN), services vision managés (lock-in cloud). Voir wiki `Fournisseurs IA` pour le détail chiffré et les sources.

## Posture Megathon — 2026-06-20

La direction UE+coût reste la cible B2B, mais elle ne doit pas bloquer la
validation du week-end. Les fournisseurs Megathon sont choisis pour shipper :

- **Voix/TTS** : arbitrage ouvert Vapi vs ElevenLabs. Vapi maximise la track
  Voice et le barge-in ; ElevenLabs maximise la qualité TTS et profite d'un
  compte disponible.
- **LLM** : provider managé rapide ; grounding par notices chargées, pas par
  confiance aveugle dans le modèle.
- **Vision** : ARKit image tracking, pas fournisseur IA externe.
- **Paiement** : Mollie n'est pas un port IA, mais c'est un port business du
  happy path ; hosted checkout + webhook "premium unlocked".

Après Megathon, tout choix provider repasse par le harnais `docs/eval/` avant de
devenir une décision produit durable.

## Conséquences

- (+) Stack à dominante UE/self-host → argument B2B musées publics + coût marginal bas + souveraineté.
- (+) Vision réutilise l'infra pgvector (vecteurs texte + image, même store).
- (−) Plus de MLOps (héberger les modèles open) ; qualité TTS self-host à valider (risque vs ElevenLabs).
- Les choix finaux sortent du **harnais d'éval** (`docs/eval/`), pas de ce document.
