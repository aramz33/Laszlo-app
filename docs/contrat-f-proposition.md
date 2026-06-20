---
tags: [projet/laszlo, type/proposition, statut/a-trancher]
date: 2026-06-20
---

# Proposition — flow hotspots + follow-ups (input réunion contrat `f()`)

> Proposition côté app (Siffrein) pour la **réunion contrat `f()`** (à figer Adam × Siffrein,
> dérivée du panel flow). Affine M34 (ADR 0014, révision 20/06) : précise *comment* les
> hotspots préchargés et le Q&A live s'enchaînent, et **ajoute un artefact de sortie** que
> M34 ne couvre pas (les follow-ups).

## Flow retenu

```
scan / début visite → précalcule les textes hotspots (profil + langue)   [démo: tout upfront]
tap hotspot         → affiche le texte pré-généré (instantané, zéro appel LLM au tap)
   pendant lecture  → génère 3 follow-ups basés sur l'historique de SESSION (1 appel)
                       → animation de chargement le temps que ça arrive (dwell TTS = large)
tap follow-up / Q   → /ask live (historique inclus)
```

## Décisions

- **Textes hotspots = pré-générés, jamais mutés.** Reformulés par profil + langue (pas de
  `narration_text` brut). Déterministes pour toute la visite → zéro risque de hallucination
  ou d'incohérence sur le chemin chaud. Conforme M34 : pas d'appel LLM **au tap**.
- **Génération en fond, opportuniste** (pas lazy au tap). Pour la démo : **tout précalculé
  dès le début** → aucun effet démo qui plante. En prod : au scan / début de visite.
- **Follow-ups = le bon endroit pour le signal « ce que l'utilisateur veut explorer ».**
  3 questions de suivi générées **pendant la lecture/écoute** du hotspot courant, basées sur
  l'**historique complet de la session** (pas juste le hotspot courant). C'est ça qui rend la
  visite adaptative — pas la mutation des hotspots voisins (rejetée : invisible + N-1 appels +
  non-déterministe).
  - **1 seul appel** pour les 3 (« génère 3 questions de suivi »), pas 3 appels.
  - **Pas de fallback statique** : le dwell (lecture, surtout écoute TTS = plusieurs secondes)
    couvre la génération. Animation de chargement suffit.
- **Tap follow-up → `/ask`** (question injectée + historique). Pas un nouveau chemin.

## Impact contrat (à figer avec Adam)

M34 décrit `/ask` (chat libre, point placé, conversation depuis hotspot). Cette proposition
ajoute **un artefact de sortie non couvert** :

- **Générer N follow-ups** : entrée = historique session + hotspot courant + notices œuvre ;
  sortie = **liste de questions** (≠ texte streamé). Variante de `/ask` ou endpoint dédié — à
  trancher. Côté app : déclenché à l'ouverture d'un hotspot, affiché sous le texte.

## Questions ouvertes (réunion)

- 🟡 Adaptation profil des textes hotspots : **fixe** (1 texte) vs **pré-généré par profil**
  (batch hotspot × profils golden). Les deux gardent le tap instantané. (= 🟡 ouvert M34)
- 🟡 Follow-ups : **variante de `/ask`** ou **endpoint dédié** ? Forme de sortie (JSON liste).
- 🟡 Où vit le mapping onboarding → fragment profil LLM (serveur, cf. TODO) et comment il
  alimente la pré-génération des textes hotspots.
