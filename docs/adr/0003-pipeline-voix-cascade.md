# ADR 0003 — Pipeline voix : cascade, streaming, barge-in

**Statut :** Accepté · 2026-06-15

## Contexte

Voix bidirectionnelle, multilingue. Adam exige : contrôle sur chaque étape **et** latence minimale **et** interruption native (barge-in). Le grounding sur le contenu musée est le produit.

## Décision

**Cascade STT → LLM → TTS**, chaque étage streamé. Rejet du speech-to-speech temps réel comme mécanisme principal (perte de grounding fin + couplage fournisseur), mais réservé comme **adaptateur alternatif futur** (mode bavardage libre) derrière le même protocole.

**Pile latence (chemin chaud) :**
- STT streaming + VAD, endpointing rapide (pas d'attente de fin de phrase).
- LLM streamé, TTFT minimal : contexte pré-chargé, prompt court, prompt caching.
- TTS découpé à la clause : 1re proposition synthétisée dès qu'elle est prête.

**Barge-in = machine à états de session** `Listening → Thinking → Speaking`, avec transition d'interruption `Speaking → Listening` (parole détectée → `cancel()` LLM + flush TTS).

**Exigences induites :**
- Audio **full-duplex** côté client + **annulation d'écho (AEC)**.
- `cancel()` propagé sur les ports LLM et TTS (cf. ADR 0001).
- **Mode d'écoute paramétrable par surface** : R1 = push-to-talk ; lunettes = micro ouvert + VAD barge-in. C'est un paramètre de session, pas une hypothèse en dur.

## Posture Megathon — 2026-06-20

La voix est le coeur de la démo. La priorité n'est pas de construire la cascade
maison complète, mais de montrer le moment :

> Tu te tiens devant une oeuvre. Tu lui parles. Elle répond à voix haute. Tu peux
> la couper.

Décision ouverte jusqu'au SYNC 1 :

- **Vapi** si le live voice + barge-in est le plus rapide et permet la track
  Voice.
- **ElevenLabs** si la qualité TTS et le compte déjà disponible accélèrent la
  démo.
- **Combinaison** possible : audio pré-généré ElevenLabs pour hotspots + Vapi
  pour conversation live, si le risque de deux voix reste acceptable.

Acceptations week-end :

- **Narration des hotspots = générée live au runtime** (révision 20/06) depuis
  `narration_text` + profil/voix, comme le chat → une seule voie, narration
  personnalisable (niveau/langue/voix à la volée). Le pré-rendu n'est qu'un **cache
  de secours** si la latence live casse le wow (8 hotspots phares, trivial à générer).
- Le chat libre doit répondre en vocal ou texte.
- Le barge-in peut être démontré par coupure de TTS et reprise d'écoute même si
  le full-duplex complet n'est pas parfait.
- Le texte des notices/hotspots reste dans la DB ; l'audio est un artefact
  dérivé.

## Conséquences

- (+) Feeling proche du S2S sans renoncer au contrôle ni au grounding.
- (+) Chaque brique reste swappable.
- (−) Vraie ingénierie temps réel (état, AEC, cancellation) — coût accepté.
