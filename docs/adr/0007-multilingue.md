# ADR 0007 — Stratégie multilingue

**Statut :** Accepté · 2026-06-15

## Contexte

"Multilingue dès le départ" est un pilier. Sources mixtes : Paris Musées (FR), Met (EN). Visiteurs internationaux. Contraintes : qualité du vocabulaire d'art, latence, coût, stockage.

## Décision

- **Pivot = anglais** (langue la plus riche en sources + modèles les plus forts).
- **Conserver la source en langue originale** (`texte_orig`) à côté du pivot EN → pas de perte de nuance pour un musée FR.
- **Sources additionnelles** : pré-traduction via **DeepL** quand on veut du grounding stocké dans une autre langue.
- **Sortie** : modèle LLM multilingue qui **génère directement dans la langue du visiteur** à partir du grounding (la notice est de la matière, pas le texte affiché).
- **Champs canoniques** (titres, noms de mouvements) localisés via Wikidata ; strings UI + follow-ups localisés.

## Posture Megathon — 2026-06-20

La démo doit montrer le multilingue sans créer de dette :

- Les données Rijks fournissent déjà des titres/descriptions EN+NL.
- **Seules EN+NL sont stockées** (notices Rijks + extraits Wikipedia) ; FR et autres
  langues sont **générées au runtime** depuis le grounding (aucune notice traduite figée).
- FR/EN sont prioritaires pour la scène ; NL est un bonus local si stable.
- Les notices phares peuvent être révisées en EN puis utilisées pour répondre
  dans la langue de l'utilisateur.
- Le changement de langue en live est un effet fort, mais il ne doit pas passer
  devant la stabilité voix + barge-in.

## Options considérées

| Option | Statut | Raison |
|---|---|---|
| Notices stockées + relues par langue | Rejeté | coût génération×langues + re-revue par langue |
| Pivot + traduction runtime de la notice | Partiel | utile pour grounding stocké (DeepL), pas pour l'output |
| **Pivot EN + génération en langue cible** | **Retenu (output)** | multilingue quasi gratuit, exploite la génération runtime |
| Pivot FR | Remplacé par EN | EN plus riche en sources/modèles |

## Conséquences

- (+) Multilingue conversationnel quasi gratuit, pas de table de traductions à maintenir.
- (−) Pas de revue humaine de l'output par langue → on s'appuie sur la force multilingue du LLM (mitigation : cache + revue des réponses fréquentes plus tard).
