# ADR 0009 — Navigation spatiale & directions relatives

**Statut :** Accepté · 2026-06-15

## Contexte

L'IA doit pouvoir diriger le visiteur ("le Renoir est derrière toi, à gauche"). Déclic : **le scan QR / la photo CV qui identifie l'œuvre ancre GRATUITEMENT la position ET l'orientation** (le visiteur est devant l'œuvre, tourné vers elle). Donc les directions relatives ne nécessitent PAS de tracking continu.

## Décision — couche spatiale progressive

Modéliser dès maintenant : `Œuvre.position{salle_id, étage, x?, y?, orientation_face}` + entité `AdjacenceCirculable` (arêtes œuvre↔œuvre / salle↔salle : direction relative, distance≈, passage).

| Niveau | Donnée | Capacité IA | Cible |
|---|---|---|---|
| **L0** | graphe topologique d'adjacence (sans coords), capté à la main | "la prochaine est dans la salle suivante, à droite" — **ancré sur le scan** | **POC** |
| **L1** | + coordonnées plan 2D | relèvements relatifs : "à 8m derrière toi, à gauche" | **MVP / téléphone** |
| **L2** | + position live (géomagnétique) + cap (boussole/IMU/visuel) | turn-by-turn continu + flèches AR | V2 / lunettes |

## Posture Megathon — 2026-06-20

La navigation indoor est hors scope du week-end. La seule spatialité construite
est l'ancrage AR de l'oeuvre détectée :

- ViroReact fournit identité + ancrage de l'oeuvre (via ARKit iOS / ARCore Android).
- L'app affiche un point bleu ancré sur le tableau.
- Le point ouvre une vue détail 2D.
- Les hotspots sont des coordonnées sur l'image, pas une position indoor.

Il n'y a pas de graphe `AdjacenceCirculable` obligatoire pour le happy path. Si
un écran "scale" mentionne plusieurs oeuvres ou salles, il reste narratif.

## Options considérées

| Sujet | Options | Retenu |
|---|---|---|
| Directions sans géoloc continue | impossible / **ancrage sur scan** | **ancrage sur scan** (L0) |
| L1 sur téléphone | réservé lunettes / **aussi téléphone** | **aussi téléphone** |
| L2 (live + AR) | maintenant / **V2 lunettes** | **V2 lunettes** (port `PositionProvider` géomagnétique réactivable) |

## Conséquences

- (+) 80% de la magie directionnelle dès le POC, sans infra de positionnement.
- (−) Les visites terrain (Petit Palais) doivent capturer **l'adjacence circulable** (quelle œuvre mène à quelle œuvre, par quelle porte) — donnée absente de l'open data.
