# ADR 0004 — Stratégie de sourcing des données musée

**Statut :** Accepté · 2026-06-15

## Contexte

Besoin de tester la récupération **à grande échelle** dès le départ ET d'avoir un musée POC avec des notices de qualité. Scope géographique : **Paris d'abord** (le plus simple), extensible aux grandes villes ensuite.

## Décision durable

- **Corpus primaire = Paris Musées Open Content** (CC0, ~150k œuvres HD, 14 musées Ville de Paris). Sert à la fois la largeur (milliers d'œuvres pour stresser la récupération) et la profondeur (le musée POC en sort).
- **Musée POC pressenti = Petit Palais** (données CC0 déjà dispo) — à confirmer après les visites terrain.
- **Notices neutres ancrées** : génération / consolidation LLM contrainte aux sources
  citées (Wikipedia, notice musée, SemArt, sources d'histoire de l'art), provenance
  obligatoire + **revue humaine** sur les œuvres du POC. Les angles de médiation sont
  appliqués au runtime, pas stockés comme notices séparées.
- **Joconde / POP** = filet pour tout musée français hors Ville de Paris.
- Scope géographique = contrainte d'ingestion (champ `ville/région` sur `Musée`), pas un changement de modèle.

## Options considérées

| Stratégie | Statut | Raison |
|---|---|---|
| Largeur seule (gros dataset, notices génériques) | Rejeté | démo musée médiocre |
| Profondeur seule (curer un musée à la main) | Rejeté | impossible de tester l'échelle |
| **Stratifié largeur + profondeur** | **Retenu** | colle au "concevoir pour l'échelle, remplir progressivement" |

| Source | Statut | Usage |
|---|---|---|
| Paris Musées | **Retenu** | corpus primaire CC0 Paris |
| Joconde / POP | **Retenu (filet)** | musées FR hors Ville de Paris |
| Kaggle SemArt / WikiArt | **Candidat** | amorçage des angles de médiation / concepts (Form/Content/Context) |
| The Met Open Access | **Différé** | barreau d'expansion hors Paris |
| Jeu de Paume | **Rejeté** | œuvres sous droits (photo/contemporain) |

## Posture Megathon — 2026-06-20

Pour le week-end, le corpus actif n'est pas Paris Musées. Il est remplacé par
**Rijksmuseum**, parce que le hackathon est à Amsterdam et que le pitch doit
résonner localement :

- **Rijksmuseum Data Services** (métadonnées) : OAI-PMH sans clé, metadata `edm`,
  images IIIF Micrio, données CC0.
- **Set** : **`260214`** « Top 1000 » (**1040 œuvres**, inclut les phares). ⚠ Sets
  écartés le 20/06 : `26121` (Dutch 17th c catalogue) exclut les œuvres iconiques + ~6 %
  de couverture Wikipedia ; `26021` = coquille. Top 1000 = masterpieces, phares garantis,
  forte couverture (meilleure matière pour un guide conversationnel que la cohérence
  thématique d'un catalogue vide).
- **Enrichissement multi-sources (sans LLM, ajout 20/06)** : la couverture narrative
  Rijks est trouée (desc courte, ~50 % vides) → métadonnées Rijks **+ Wikidata** (pont
  via n° d'inventaire P217 + collection P195 ; mouvement, sujets, sitelinks) **+
  Wikipedia** (extrait narratif, là où l'article existe → gate + repli Rijks).
  Notices stockées **par source** (rijks `ok`, wikipedia `review`), provenance native.
- **Pourquoi** : Amsterdam-local, droits livestream sûrs, métadonnées riches,
  oeuvres iconiques, Linked Art/EDM compatible avec notre graphe.
- **Europeana** : story d'échelle UE, pas une intégration du week-end.
- **Critère de sélection** : CC0 + image HD + metadata riche + au moins 1-2 phares.

Cette posture ne supprime pas le sourcing Paris/Petit Palais ; elle définit le
terrain de validation Megathon.

## Conséquences

- (+) Corpus Paris-scoped cohérent avec la géoloc et le déploiement réel.
- (−) Les notices Laszlo neutres et le glossaire gradué n'existent dans aucune source →
  pipeline de consolidation + revue à construire.
