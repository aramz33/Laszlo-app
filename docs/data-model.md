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
- **Pipeline agnostique à la voix** : on stocke le **texte** des hotspots/notices ;
  l'audio est **généré live au runtime** (pas de pré-rendu dans le pipeline).
- **Langue source conservée** + pivot EN quand utile ; sortie multilingue générée au
  runtime. On ne stocke pas le FR par défaut.

## Contrat Supabase Megathon

Ce contrat est figé au SYNC 1. `/pipeline` écrit ces tables ; `/app-mobile` les lit ;
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
- `lang` vaut actuellement `en` ou `nl` pour Rijks. Principe durable : stocker la langue
  du musée / de la source scrapée et une traduction EN si nécessaire pour le grounding.
  Le FR et les autres langues de sortie sont **générés au runtime** depuis le grounding
  (pas de traduction figée par défaut).
- `groundedness` vaut `ok` (rijks) ou `review` (wikipedia jusqu'à révision des phares).
- les anciens noms de travail `default`/`technique`/`histoire`/`symbolisme` ne sont **pas
  stockés** : ce sont des **angles de médiation runtime** appliqués par le LLM sur la
  notice, + des boutons UI. La taxonomie peut évoluer sans migration de schéma.
- `wikidata_qid` (sur `artwork`/`artist`/`movement`) = pont vers les faits structurés ;
  `tags` (jsonb) = sujets/genre Wikidata (P180/P136).
- `x` et `y` sont normalisés sur l'image de l'oeuvre, entre `0` et `1`.
- `height_cm` et `width_cm` sont requis pour les reference images AR et le
  `physicalWidth` ViroReact.
- **Texte du hotspot ancré = seed/fallback stocké**, pas le texte final dit au visiteur.
  `narration_text` reste le substrat révisé main pour les phares ; à l'entrée dans la vue
  œuvre, l'app lance **un seul appel batch** `generate mode=hotspot` (les N hotspots de
  l'œuvre) → textes personnalisés par profil/langue, conditionnés par l'historique de session
  (influence œuvre-à-œuvre). Le tap lit le texte déjà prêt ; fallback `narration_text` à 3 s.
  Cf. contrat **ADR 0014**.
- `audio_url` = `null` par défaut : l'**audio** du hotspot est **synthétisé live au runtime**
  (TTS) depuis le texte (+ voix/vitesse). `audio_url` n'est qu'un **cache optionnel** si
  la latence TTS l'exige (non rempli par le pipeline).
- `image_iiif_id` vient de Micrio/Rijks ; `image_url` = hotlink IIIF (affichage) ;
  `ref_image_url` = rendition légère de tracking AR (Storage), générée pour les
  œuvres trackées.

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
  Affichage = `/{imageId}/full/max/0/default.jpg` ; reference image AR = rendition
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
- image d'affichage (hotlink IIIF) + reference image AR (œuvres trackées) ;
- **notices par source** (`rijks` → `ok`, `wikipedia` → `review`) avec provenance ;
- hotspots des phares, révisés manuellement.

## État actuel / prochaines couches / à ne pas faire

### État actuel implémenté

- Couche **Connaissance** construite : `artist`, `movement`, `museum`, `artwork`,
  `notice`, `hotspot`.
- `notice` = substrat neutre ancré, 1 ligne par `(œuvre × langue stockée × source)`.
- Pour Rijks, les langues stockées actuelles sont `en` et `nl`.
- L'app lit via PostgREST : `artwork?select=*,notice(*),hotspot(*)`.
- L'output multilingue est généré au runtime par l'IA, puis vocalisé par le provider TTS.
- L'audio n'est pas stocké dans `notice`.

### Prochaines couches à construire

- **Glossaire / vocabulaire gradué** : future table `term` / `terme`, avec définitions par
  niveau de parole et sourcing structuré.
- **Profil utilisateur** : préférences neutres et orthogonales d'onboarding, pas personas
  nommés au départ.
- **Angles de médiation runtime** : boutons/instructions qui orientent la génération sans
  créer de colonne ou de table de notices par angle.
- Lien éventuel `notice` ↔ `hotspot` : sujet à rediscuter plus tard, pas dans le contrat
  actuel.

### À ne pas faire

- Ne pas ajouter `notice.facet`.
- Ne pas créer de notices `default` / `technique` / `histoire` / `symbolisme`.
- Ne pas stocker le FR par défaut.
- Ne pas pré-rendre d'audio dans `notice`.
- Ne pas confondre `hotspot.aspect` avec une facette de notice.

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
  notices[] (substrat neutre, 1 par source ; angles = médiation runtime),
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

- **Langue source conservée** ; pivot EN quand utile pour le grounding et les modèles.
- Pour Rijks, les titres/descriptions EN+NL sont conservés parce que ce sont les langues
  disponibles.
- Le FR n'est pas stocké par défaut : le LLM génère la réponse dans la langue visiteur à
  partir du grounding, puis le TTS produit l'audio.

## Adaptation du contenu

Le profil visiteur = **3 axes orthogonaux**, un tap chacun à l'onboarding (ludique,
rapide). Tous s'appliquent **au runtime** (la notice reste un substrat neutre ; rien
n'est pré-stocké) et sont **additifs** sur le contrat figé → **aucune migration** de la
couche Connaissance. Démo = 3 questions skippables ; persona + mémoire = couches
suivantes. Cadrage et justification : **ADR 0008**.

| Axe profil | Valeurs | Effet sur la sortie / mécanisme |
|---|---|---|
| **Motivation** (mode de lecture) | `contemplate` · `understand` · `stories` | sensoriel / explicatif / narratif — instruction runtime (system prompt) |
| **Connaissance** | `newcomer` · `comfortable` · `expert` | registre / vocabulaire — instruction runtime (+ futur glossaire gradué, table `term`) |
| **Profondeur** | `quick` · `standard` · `deep` | longueur — paramètre de génération runtime |

Hors profil : l'**angle d'intérêt** (technique/histoire/symbole/personnages) n'est **pas**
un axe de profil. **Parqué hors démo** → futur « power feature » (skill/commande dans le
chat), pas un bouton de steering. Champ `kid` (bool) réservé à de futures features enfants.

**Architecture en 3 couches :** Connaissance (partagée, ce contrat) → Glossaire /
vocabulaire gradué (termes, définitions par niveau) → Profil utilisateur (préférences
neutres). La mémoire et le cadrage musée sont des couches produit ultérieures. La sortie
dite à l'utilisateur est **générée au runtime** = f(notice, glossaire@niveau,
préférences utilisateur, langue visiteur, voix/TTS). Un texte pré-mâché ne pourrait ni
s'adapter ni apprendre — d'où la notice-substrat.

`f()` vit dans une **Edge Function Supabase** (`POST /functions/v1/generate`),
**mono-appel LLM**, **texte→texte** ; la voix (STT/TTS) est une brique séparée qui
l'encadre. Contrat d'entrée/sortie + justification : **ADR 0014**.

## Navigation et AR

Pour le Megathon, la couche spatiale n'est pas un graphe indoor complet.
ViroReact identifie l'oeuvre et affiche un point ancré via ARKit côté iOS et
ARCore côté Android ; l'app ouvre ensuite une vue détail 2D. Les hotspots sont
de simples coordonnées sur l'image connue.

La navigation indoor L0-L2 de l'ADR 0009 reste une cible produit ultérieure.

## Donnée utilisateur

Le flux d'événements complet reste la cible de l'ADR 0010. Le week-end, on
capture seulement le minimum utile au pitch :

- activation Mollie d'un package/pilot venue ;
- oeuvres ouvertes ;
- hotspots déclenchés ;
- questions posées si le consentement est clair ;
- signups ou QR scans si disponibles.

Audio et médias bruts ne sont pas nécessaires au signal Megathon.
