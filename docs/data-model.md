# Modèle de données — Laszlo

Source de vérité du graphe de connaissance et du contrat entre les lanes
Megathon. Voir ADR [0002](adr/0002-modele-connaissance-recuperation.md),
[0004](adr/0004-strategie-sourcing-donnees.md),
[0007](adr/0007-multilingue.md) et
[0008](adr/0008-adaptation-contenu.md).

## Principes

- **Graphe d'entités, jamais chunké.** Identique à 30 ou 300 000 oeuvres.
- **Provenance dans le modèle** : tout fait porte ses sources.
- **Séparation fait / narration** : les notices ancrées sont distinctes de la
  voix, du ton et du rendu audio.
- **Pipeline agnostique à la voix** : on stocke le texte des hotspots/notices ;
  la génération audio est une étape séparée.
- **Pivot EN** + conservation des langues source disponibles ; sortie
  multilingue générée au runtime.

## Contrat Supabase Megathon

Ce contrat est figé au SYNC 1. `/pipeline` écrit ces tables ; `/app-ios` les lit ;
`/shared` expose les types générés.

```sql
artist   (id, name, birth_year, death_year, wikidata_qid)
movement (id, name, wikidata_qid)
museum   (id, name, city)

artwork  (id, object_number, title_en, title_nl, year,
          height_cm, width_cm,
          image_iiif_id, image_url, ref_image_url,
          artist_id, movement_id, museum_id, rights,
          wikidata_qid, tags jsonb)

notice   (id, artwork_id, lang, source,
          text, sources jsonb, groundedness)

hotspot  (id, artwork_id, x, y,
          title, aspect, narration_text,
          audio_url, duration_s, ord)
```

Contraintes de sens :

- `notice` = **substrat neutre ancré**, jamais le texte final dit à l'utilisateur.
  Une ligne = **(œuvre × `lang` × `source`)** ; au runtime on injecte toutes les
  lignes de l'œuvre ouverte (chemin chaud, ADR 0002).
- `source` vaut `rijks` ou `wikipedia`.
- `lang` vaut `en` ou `nl` (seules langues **stockées**) ; FR et autres langues sont
  **générées au runtime** depuis le grounding (pas de traduction figée).
- `groundedness` vaut `ok` (rijks) ou `review` (wikipedia jusqu'à révision des phares).
- les 4 « facettes » (`default`/`technique`/`histoire`/`symbolisme`) ne sont **pas
  stockées** : ce sont des **lentilles runtime** appliquées par le LLM sur la notice,
  + des boutons UI. La taxonomie peut évoluer sans migration de schéma.
- `wikidata_qid` (sur `artwork`/`artist`/`movement`) = pont vers les faits structurés ;
  `tags` (jsonb) = sujets/genre Wikidata (P180/P136).
- `x` et `y` sont normalisés sur l'image de l'oeuvre, entre `0` et `1`.
- `height_cm` et `width_cm` sont requis pour les reference images ARKit.
- `audio_url` peut être `null` tant que le TTS n'a pas généré l'audio.
- `image_iiif_id` vient de Micrio/Rijks ; `image_url` = hotlink IIIF (affichage) ;
  `ref_image_url` = rendition légère ARKit (Storage), générée pour les œuvres trackées.

## Données Rijksmuseum

Source Megathon (métadonnées) :

- OAI-PMH : `https://data.rijksmuseum.nl/oai`
- Metadata prefix : `edm`
- Set : **`260214`** « Top 1000 » du Rijksmuseum (**1040 œuvres**, **inclut les phares**).
  ⚠ Sets écartés (20/06) : `26121` (Dutch 17th c catalogue) **exclut** les œuvres
  iconiques — Night Watch/Laitière sont dans d'autres setSpecs — et n'a que ~6 % de
  couverture Wikipedia ; `26021` initial = coquille. Le Top 1000 = masterpieces curées,
  phares garantis, forte couverture Wikipedia.
- Pagination : `resumptionToken` (50/page).
- **IIIF imageId** : directement dans `edm:isShownBy`/`edm:object`
  (`https://iiif.micr.io/{imageId}/...`) — **pas** de détour Linked Art `?_profile=la`.
  Affichage = `/{imageId}/full/max/0/default.jpg` ; reference image ARKit = rendition
  redimensionnée par IIIF `/{imageId}/full/{w},/0/default.jpg`.
- Créateur : URI résolue en **Linked Art JSON** (`Accept: application/ld+json`).
- Phares : Night Watch `SK-C-5` (Q219831) et La Laitière `SK-A-2344` (Q167605).

**Enrichissement multi-sources (sans LLM)** — la couverture narrative du Rijks est
trouée (desc courte, ~50 % vides) → on sépare métadonnées (fiables) et contenu (enrichi) :

- **Wikidata** (pont via `object_number` P217 + collection Rijks P195=`Q190804`) →
  Q-id pour **toutes** les œuvres + faits structurés : mouvement (P135) → graphe,
  sujets/genre (P180/P136) → `tags`, sitelinks enwiki/nlwiki.
- **Wikipedia** (extrait via l'article lié) → notice `source=wikipedia`, mais **seulement
  pour les œuvres ayant un article** (gate). Sinon repli sur la desc Rijks.

Le pipeline extrait / produit :

- identifiants Rijks (`object_number`, URI), titres EN/NL, créateur, date,
  `dcterms:extent`, rights, imageId IIIF ;
- dimensions physiques en cm depuis `extent` (height/width, le poids est ignoré) ;
- image d'affichage (hotlink IIIF) + reference image ARKit (œuvres trackées) ;
- **notices par source** (`rijks` → `ok`, `wikipedia` → `review`) avec provenance ;
- hotspots des phares, révisés manuellement.

Le parser doit rester défensif : la version OAI-PMH/EDM a changé en juin 2026.

## Graphe durable

Le contrat Megathon est le noyau minimal. Le modèle cible garde les entités
suivantes :

```text
Musée
  id, nom, ville/région, geo{lat,lng,rayon}, ssids[],
  source_provider, licence_defaut,
  editorial{ positionnement, voix, statut }

Exposition
  id, musée_id, titre, type, période, description

Salle
  id, musée_id, nom/numéro, étage, ordre

Oeuvre
  id, salle_id, source_refs{rijks, europeana, paris_musees, joconde, wikidata_qid},
  titre{canonique + traductions}, artiste_id, mouvement_id,
  date, medium, dimensions, image_hd{url, licence}, ref_image_url,
  notices[] (substrat neutre, 1 par source ; facettes = lentilles runtime),
  tags[], cadrage_musée[], langue_pivot = EN,
  position{salle_id, étage, x?, y?, orientation_face}

AdjacenceCirculable
  oeuvre<->oeuvre / salle<->salle, direction_relative, distance, passage

Artiste
  id, nom, dates, bio_courte, wikidata_qid, mouvements[]

Mouvement
  id, nom, période, description

Terme
  id, terme_EN, domaine, définitions{découverte, amateur, passionné},
  traductions, liens{oeuvres, mouvements, artistes}
```

## Multilingue

- **Pivot = EN** ; les titres/descriptions Rijks EN+NL sont conservés.
- FR/EN sont les langues de démo prioritaires ; NL est un bonus local.
- Le LLM génère la réponse dans la langue visiteur à partir du grounding, au
  lieu de servir une notice traduite statique.

## Adaptation du contenu

Les 3 cadrans s'appliquent **tous au runtime** (la notice reste un substrat neutre ;
aucun n'est pré-stocké). Ils sont **additifs** sur le contrat figé (Allure = aucun
stockage ; Niveau = future table `term` ; Centre d'intérêt = lentille runtime), donc
n'imposent **aucune migration** de la couche Connaissance. Démo = profil 3 questions
skippable ; personas + mémoire = couches suivantes (designées + pitchées).

| Profil | Cadran | Mécanisme |
|---|---|---|
| Allure | longueur | paramètre de génération (runtime) |
| Niveau | registre / vocabulaire | glossaire gradué (table `term`, injection runtime) |
| Centre d'intérêt | facette / chemin | **lentille runtime** sur la notice unique (4 chemins `default`/`technique`/`histoire`/`symbolisme` = boutons UI, taxonomie non figée) |

**Architecture en 3 couches :** Connaissance (partagée, ce contrat) → Personnalisation
(profil/persona/cadrage musée, par utilisateur) → Mémoire (apprend dans le temps). La
sortie dite à l'utilisateur est **générée au runtime** = f(notice, glossaire@niveau,
profil/persona, mémoire, cadrage musée). Un texte pré-mâché ne pourrait ni s'adapter ni
apprendre — d'où la notice-substrat.

## Navigation et AR

Pour le Megathon, la couche spatiale n'est pas un graphe indoor complet. ARKit
identifie l'oeuvre et fournit la pose 3D ; l'app affiche un point ancré qui
ouvre une vue détail 2D. Les hotspots sont ensuite de simples coordonnées sur
l'image connue.

La navigation indoor L0-L2 de l'ADR 0009 reste une cible produit ultérieure.

## Donnée utilisateur

Le flux d'événements complet reste la cible de l'ADR 0010. Le week-end, on
capture seulement le minimum utile au pitch :

- conversions Mollie live ;
- oeuvres ouvertes ;
- hotspots déclenchés ;
- questions posées si le consentement est clair ;
- signups ou QR scans si disponibles.

Audio et médias bruts ne sont pas nécessaires au signal Megathon.
