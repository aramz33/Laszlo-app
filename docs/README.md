# Laszlo — documentation technique

Guide de musée conversationnel, voice-first, construit en public au Megathon.
Ce dossier est la **couche ingénierie versionnée** du projet : décisions,
contrat de données, critères fournisseurs et harnais d'évaluation. Il vit avec
le code.

Source de vérité produit active pour le build Megathon :
`Adam's Vault/6 - Main Notes/Projets/Laszlo/Megathon/`.

## Ce que l'on construit maintenant

**Thèse Megathon : build broad, demo deep.** On utilise le week-end comme moteur
de validation : une démo voice-first jouable en live, avec un signal de paiement
réel, et un pipeline qui prouve que le contenu peut passer à l'échelle.

Périmètre du build :

- **Pipeline Rijksmuseum** : ingestion OAI-PMH `edm` du set `26021` Dutch
  Paintings 17th c., résolution d'images IIIF, filtrage CC0 + HD, génération de
  notices par facette, hotspots et chargement Supabase.
- **Démo profonde** : 1-2 oeuvres phares, candidates principales : Night Watch
  `SK-C-5` et La Laitière.
- **Client démo** : app native iOS en Swift + ARKit/RealityKit. ARKit image
  tracking reconnaît l'oeuvre et fournit la pose ; l'utilisateur voit un point
  bleu ancré, tape dessus, puis ouvre une vue détail 2D avec hotspots, audio et
  chat.
- **Voix** : conversation vocale avec barge-in. Le fournisseur reste ouvert entre
  Vapi et ElevenLabs jusqu'au choix de SYNC 1 ; le domaine reste agnostique.
- **Paiement** : Mollie hosted checkout pour débloquer le guide premium.
  `test_...` pour la démo et `live_...` au stand pour compter les conversions
  réelles.
- **Fallbacks** : overlay 2D, QR par oeuvre et vidéo backup si l'ARKit live est
  instable.

Structure cible du monorepo :

```text
/pipeline   # Adam : harvest/refine/transform/load, écrit Supabase
/app-ios    # Siffrein : app iOS ARKit + voix + lecture Supabase
/shared     # contrat DB/types générés
/ui         # designer : composants, direction visuelle, écrans démo
```

Le schéma Supabase est la surface partagée entre les lanes. Voir
[data-model.md](data-model.md).

## ADR

Les ADR restent les décisions produit durables. Chaque ADR porte désormais une
posture Megathon lorsque le build de 45h diffère de la cible long terme.

| # | Décision durable | Posture Megathon |
|---|---|---|
| [0001](adr/0001-architecture-hexagonale.md) | Architecture hexagonale, ports & adapters, surface client jetable | Monorepo, app iOS native + backend/pipeline court ; Supabase = contrat |
| [0002](adr/0002-modele-connaissance-recuperation.md) | Graphe d'entités, récupération progressive, Postgres + pgvector | Graphe light Rijks -> Supabase ; injection directe sur 1-2 oeuvres phares |
| [0003](adr/0003-pipeline-voix-cascade.md) | Cascade STT -> LLM -> TTS, streaming, barge-in | Sponsor/provider rapide à brancher ; Vapi vs ElevenLabs à trancher |
| [0004](adr/0004-strategie-sourcing-donnees.md) | Sourcing stratifié et extensible | Rijksmuseum d'abord ; Europeana = story d'échelle UE |
| [0005](adr/0005-repartition-ondevice-cloud.md) | Hybride on-device/cloud + cache local | Providers managés, cache local des notices phares |
| [0006](adr/0006-identification-positionnement.md) | Identification derrière `ArtworkIdentifier` | ARKit image tracking pur ; overlay 2D/QR en fallback |
| [0007](adr/0007-multilingue.md) | Pivot EN + sortie multilingue au runtime | Démo FR/EN prioritaire, NL bonus |
| [0008](adr/0008-adaptation-contenu.md) | Profil 3 questions, facettes, glossaire, couche musée | Profil léger, 4 facettes visibles, style doux sur le regard |
| [0009](adr/0009-navigation-spatiale.md) | Navigation progressive et directions ancrées | Pas de navigation indoor ; seulement point AR ancré sur oeuvre |
| [0010](adr/0010-donnee-utilisateur.md) | Events pseudonymes, profil, analytics agrégées | Compter conversions Mollie + interactions minimales |
| [0011](adr/0011-pipeline-notices.md) | Notices semi-auto, gate groundedness, revue humaine | Gate simple + revue manuelle des phares |
| [0012](adr/0012-selection-fournisseurs-ia.md) | Fournisseurs swappables, choix gated par éval | Démo d'abord ; UE/coût redevient filtre après Megathon |

## Specs

- [Modèle de données canonique](data-model.md) : contrat Supabase Megathon +
  graphe durable.
- [Critères par port IA](ports-criteria.md) : critères long terme + posture
  fournisseur week-end.
- [Harnais d'évaluation](eval/README.md) : harnais durable + smoke tests
  Megathon.

## Décisions encore ouvertes

- Confirmer avec Siffrein : client démo = **natif iOS ARKit**, PWA en repli
  paywall/secondaire.
- Choix voix/TTS : Vapi, ElevenLabs, ou combinaison des deux.
- Tranche Rijks finale, nombre d'oeuvres ingérées et 1-2 phares définitives.
- Base44 vs Vercel pour le repli PWA/paywall.
- Recrue n°2 éventuelle si Siffrein porte trop de surface iOS + voix.
