# ADR 0013 — Stack frontend mobile produit

**Statut :** Accepté · 2026-06-20

## Contexte

La décision précédente poussait vers une app native iOS Swift + ARKit/RealityKit
pour accélérer une démo iPhone. Après relecture de `docs/AR Artwork Scanner
research.md`, la décision a été réouverte avec un horizon **produit-first** :
le premier client sérieux doit être cross-platform mobile et rester facile à
construire avec des coding agents.

Le besoin AR est volontairement étroit : reconnaître une œuvre plate dans un
set curé, afficher un point ancré tappable, puis basculer dans une UI mobile 2D
pour les hotspots, l'audio et le chat. La caméra n'est pas la surface principale
de médiation.

## Décision

Le frontend principal devient **Expo React Native dans `/app-mobile`**, avec
**ViroReact** comme premier adaptateur `ArtworkIdentifier`.

- ViroReact fournit l'image tracking et le point ancré en s'appuyant sur ARKit
  côté iOS et ARCore côté Android.
- Expo est le chemin par défaut pour structurer le projet, les permissions et les
  builds de développement.
- Expo Go n'est pas une cible AR : ViroReact exige un build natif personnalisé.
- Si Expo bloque, on garde React Native et on bascule vers bare React Native.
- Si ViroReact bloque, on garde l'app React Native et on remplace uniquement
  l'adaptateur d'identification.

## Options écartées

| Option | Statut | Raison |
|---|---|---|
| Swift ARKit direct | Repli iOS | Excellent contrôle AR, mais iOS-only et moins agent-friendly pour le produit cross-platform. |
| Swift + Kotlin natifs | Rejeté | Deux apps et duplication de la surface produit. |
| Unity AR Foundation | Rejeté | Solide pour l'AR, mais trop lourd pour une app de guide, voix, contenu et chat. |
| Vuforia | Futur scale | Pertinent pour gros catalogues/cloud recognition, pas pour le premier set curé. |
| 8th Wall / WebAR | Veille | Hosted platform retirée en 2026 et workflow moins aligné avec l'app mobile. |
| VisionCamera + custom CV | Futur adapter | Bon pipeline caméra, mais ne fournit pas l'ancrage AR. |
| PWA / QR / manuel | Fallback | Fiable et utile, mais ne porte pas la promesse "pointer l'oeuvre". |

## Conséquences

- Le produit garde une seule base UI en TypeScript pour iOS et Android.
- L'AR reste un adaptateur remplaçable derrière `ArtworkIdentifier`.
- Le premier jalon d'implémentation doit être un écran minimal qui détecte une
  œuvre réelle, affiche un point tappable et ouvre la même vue détail que la
  sélection manuelle.
- Les tests AR doivent se faire sur iPhone et Android physiques ; les simulateurs
  ne valident pas la décision.
