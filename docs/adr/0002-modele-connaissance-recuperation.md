# ADR 0002 — Modèle de connaissance & récupération progressive

**Statut :** Accepté · 2026-06-15

## Contexte

L'app doit répondre sur les œuvres sans halluciner. Adam veut concevoir **pour l'échelle dès le départ** (pas seulement 30 œuvres) mais implémenter **progressivement**. Contraintes : latence, contrôle, modularité.

## Décision

**Modèle canonique = graphe d'entités** (jamais chunké) :
`Musée → Exposition → Salle → Œuvre`, plus `Artiste` et `Mouvement` transverses. Chaque `Œuvre` porte une **notice structurée par facette** : `default`, `technique`, `histoire`, `symbolisme` (= les 4 chemins de connaissance). C'est la source de vérité, identique à 30 ou 300 000 œuvres.

**Stockage = Postgres + `pgvector` (Supabase)** : graphe relationnel + index vectoriel dérivé dans une seule base.

**Récupération agentique hybride** derrière une interface `Retriever` stable. La recherche vectorielle est **un outil parmi d'autres**, pas le mécanisme central. Échelle progressive (mêmes interfaces) :

| Niveau | Catalogue | Stratégie |
|---|---|---|
| 0 | œuvre ouverte | injection directe notice + voisins (**chemin chaud, permanent**) |
| 1 | ~30–100 | + recherche sémantique pgvector |
| 2 | milliers | + hybride BM25+vecteur + reranking |
| 3 | massif/multi-musées | + GraphRAG / navigation agentique |

**Principe latence : pré-chargement à la navigation.** Ouvrir une œuvre charge sa notice + voisins en contexte de session *avant* la 1re question → zéro latence de récupération sur le cas nominal. Les outils agentiques ne se déclenchent que hors chemin chaud.

**Follow-ups ancrés** : ne suggérer que des relances effectivement répondables avec le contexte chargé.

## Posture Megathon — 2026-06-20

Le build du week-end conserve le graphe, mais retire tout ce qui n'est pas
nécessaire au happy path :

- **Graphe light Supabase** : `artist`, `movement`, `museum`, `artwork`,
  `notice`, `hotspot`.
- **Source** : Rijksmuseum OAI-PMH `edm`, set **`260214`** (Top 1000, inclut les phares ;
  `26121`/`26021` écartés), images IIIF.
- **Notice = substrat neutre, non découpé en facettes** (révision 20/06) : 1 ligne par
  (œuvre × `lang` × `source`). Les 4 « chemins » `default`/`technique`/`histoire`/
  `symbolisme` sont des **lentilles runtime** + boutons UI, pas des lignes stockées.
- **Chemin chaud** : injection directe de **toutes les lignes notice** + hotspots de
  l'oeuvre ouverte. Pas de recherche vectorielle obligatoire pour la démo.
- **Phares** : 1-2 oeuvres révisées à la main, candidates Night Watch `SK-C-5`
  et La Laitière.
- **Scale story** : l'écran ou le pitch peut montrer `N` oeuvres ingérées pour
  prouver la largeur ; l'expérience live reste profonde sur peu d'oeuvres.

`pgvector` et la récupération hybride restent la trajectoire durable, mais sont
hors chemin critique Megathon.

## Conséquences

- (+) Fiabilité 100 % sur le cas nominal, pas de chunking cassé.
- (+) On monte les barreaux sans réécrire l'app.
- (+) Le wiki LLM et la base de connaissances musée tendent vers le même artefact (pages d'entités liées).
- (−) Définir et maintenir une couche d'outils de récupération, plus de travail initial qu'un top-k naïf.
