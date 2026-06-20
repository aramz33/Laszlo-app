# Critères de sélection par port IA

Chaque service IA est un **port hexagonal swappable** (ADR 0001). Ces critères
cadrent le choix de fournisseur par port.

Direction durable : **qualité, latence, coût, résidence UE**. Posture Megathon :
choisir les adaptateurs les plus rapides à démoer sans casser l'abstraction. Un
provider utilisé pendant 45h n'est pas un mariage produit.

## Posture Megathon

| Port | Choix week-end | Pourquoi |
|---|---|---|
| LLM | Provider managé rapide, au choix de l'équipe | Le chemin chaud doit répondre en live ; la résidence UE redevient filtre après |
| STT/TTS/voix | **Ouvert : Vapi vs ElevenLabs** | Vapi donne la track Voice et le barge-in clé-en-main ; ElevenLabs donne une qualité TTS forte et un compte déjà disponible |
| Vision/CV | **ViroReact image tracking**, pas embeddings runtime | Pour un set curé, l'app reconnaît l'image et fournit un point ancré via ARKit iOS / ARCore Android |
| Retriever | Injection directe notice + voisins | Les 1-2 oeuvres phares doivent être fiables sans top-k fragile |
| Embeddings | Hors chemin critique | Gardés pour la story d'échelle Europeana/60M oeuvres et le post-hackathon |

La décision voix doit être prise au plus tard au SYNC 1. Le pipeline stocke le
texte ; il ne dépend donc pas du choix Vapi/ElevenLabs.

## P1 — LLM

Deux profils :

- **Conversation chemin chaud** : TTFT streaming bas, qualité multilingue domaine
  art, coût/tour, grounding sur les notices chargées, barge-in/cancellation via
  l'orchestrateur, stabilité démo.
- **Génération runtime** : qualité, respect des sources, adaptation au glossaire et aux
  préférences utilisateur, instruction-following, coût, latence compatible conversation.

Critères durables : latence/TTFT, qualité multilingue, coût $/1M, contexte,
tool calling, grounding anti-hallucination, rate limits, résidence UE/RGPD,
prompt caching, repli on-device futur, fine-tuning, pérennité.

## P2 — STT

Streaming + partiels + VAD/endpointing, barge-in, multilingue, précision sur les
noms propres et titres d'oeuvres, accents, coût, annulation, résidence, support
iOS/web/lunettes.

Megathon : si Vapi est retenu, accepter le chemin voix intégré pour gagner du
temps. Sinon, utiliser l'option la plus simple compatible iOS et démontrer au
moins l'interruption de la réponse.

## P3 — TTS

Streaming live, TTFB bas, annulation instantanée, voix
"Laszlo" cohérente entre langues, qualité/expressivité, voix custom, coût par
caractère, licence commerciale.

Megathon : les hotspots partent de `narration_text` et l'audio est généré live au
runtime. `audio_url` reste un cache optionnel si la latence casse le wow. Le chat libre
doit répondre en vocal/texte avec la latence la plus faible possible.

## P4 — Vision / CV

Critères durables : reconnaissance d'oeuvres connues, rejet des oeuvres hors
catalogue, robustesse angle/reflets/cadrage partiel, latence, on-device vs cloud,
coût/image, résidence.

Megathon : **ViroReact image tracking est le port `ArtworkIdentifier` primaire**.
Il prend des reference images préparées depuis IIIF, les dimensions physiques de
l'oeuvre et retourne l'identité + un point ancré. Fallbacks : sélection manuelle,
QR, puis overlay 2D. Les embeddings image ne sont pas évalués dans le chemin
runtime du week-end.

## P5 — Embeddings

Critères durables : retrieval cross-lingue, dimension/coût pgvector, coût/1M,
latence, self-host/on-device, longueur max input, domaine art, MTEB, résidence,
compatibilité pgvector + reranking.

Megathon : pas de dépendance critique. Optionnel pour une démo "scale screen" ou
pour raconter la reco open-world post-hackathon.

## Process

1. Pour le Megathon : décider uniquement ce qui sert le happy path
   voix -> pipeline -> AR.
2. Après Megathon : rejouer le harnais d'évaluation sur les ports durables.
3. Consigner chaque choix fournisseur comme adaptateur remplaçable, pas comme
   dépendance de domaine.
