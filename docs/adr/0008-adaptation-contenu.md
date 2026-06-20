# ADR 0008 — Adaptation du contenu : personnalisation, glossaire, couche éditoriale musée

**Statut :** Accepté · 2026-06-15

## Contexte

Les mêmes faits ancrés doivent s'adapter (1) à l'utilisateur (profil) et (2) au musée (voix institutionnelle). Les opérateurs de musées veulent valoriser leur institution dans la médiation (ex. Reina Sofía / Guernica).

## Décision

**1. Trois cadrans de personnalisation orthogonaux**, pilotés par les 3 questions de profil :

| Axe neutre | Cadran | Mécanisme |
|---|---|---|
| Allure | longueur | paramètre de génération |
| Niveau | registre / vocabulaire | **glossaire gradué** |
| Centre d'intérêt | angle de médiation | instruction runtime + préférences utilisateur |

**2. Glossaire gradué** — entité `Terme` transverse :
- `terme_EN`, `domaine`, `définitions{découverte, amateur, passionné}`, traductions, liens.
- Sourcing : bootstrap **Getty AAT** (+ tags AAT déjà présents dans les données du Met) + Wikipedia, gradation LLM + revue humaine sur les termes clés du POC.
- Usage : **conditioning + grounding** (le tier du profil sélectionne les définitions injectées en contexte ; glose inline du jargon). Post-check optionnel pour repérer un terme au-dessus du tier.
- **Global d'abord**, enrichi par musée (`TermeMusée`).

**3. Couche éditoriale musée — modèle à deux couches :**
- Faits ancrés (notices neutres, cités) **séparés** du cadrage institutionnel (`CadrageMusée` : emphase, voix, flagship ; `Musée.editorial`).
- **Précédence** : `faits ancrés > cadrage musée > persona`. Le musée module emphase/voix, **jamais les faits** ; tout fait avancé par le musée passe par la provenance.
- C'est le **produit B2B** (co-construction, différenciateur vs Smartify).
- **POC** : réserver les emplacements dans le schéma **et** synthétiser une couche musée provisoire depuis les sources publiques (site, mission, presse, Wikipedia), statut `synthétisé` → `validé_musée` à l'onboarding.

## Posture Megathon — 2026-06-20

On garde l'adaptation visible, mais légère :

- Profil 3 questions skippables si l'UI le permet.
- **Révision 20/06 — les 3 cadrans s'appliquent TOUS au runtime** (la notice reste un
  substrat neutre, cf. ADR 0002). Le Centre d'intérêt n'est **plus** une sélection de
  notice stockée mais un **angle de médiation runtime** sur la notice unique.
  Conséquence : les cadrans sont **additifs** (Allure = aucun stockage ; Niveau =
  future table `term` ; Centre d'intérêt = instruction runtime) → aucune migration du
  contrat figé.
- Les angles doivent **apparaître dans la démo** (boutons UI → instruction runtime),
  mais la **taxonomie n'est pas figée** et doit être repensée en termes humains/sociaux
  — modifiable sans toucher au schéma.
- Le designer possède le rendu : identité "doux sur le regard", lisible,
  centrée sur l'oeuvre, sans distraire.
- La couche éditoriale musée complète est hors scope ; le pitch mentionne le
  B2B/co-construction.

## Options considérées

| Sujet | Options | Retenu |
|---|---|---|
| Portée glossaire | global / per-museum | **global + enrichi musée** |
| Couche éditoriale | (a) grounding indifférencié / (b) deux couches fait+cadrage / (c) override total musée | **(b)** |
| POC éditorial | build complet / réserver slots seulement / **réserver + synthèse provisoire** | **synthèse provisoire** |

## Conséquences

- (+) "L'IA s'adapte à ton niveau" devient concret et contrôlable ; voix institutionnelle = argument B2B.
- (+) Anti-hallucination préservé malgré la valorisation institutionnelle.
- (−) Construire le glossaire gradué + le pipeline de synthèse de couche musée.
