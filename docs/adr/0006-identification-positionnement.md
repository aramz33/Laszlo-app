# ADR 0006 — Identification d'œuvre & positionnement indoor

**Statut :** Accepté (POC) · exploration ouverte (positionnement) · 2026-06-15

## Contexte

Distinguer **identifier l'œuvre devant soi** (besoin POC) du **tracking continu / point bleu** (besoin produit plus tardif). La géoloc GPS ne sert qu'au niveau musée. Voir registre complet : wiki `Positionnement`.

## Décision

- **Identification d'œuvre = port `ArtworkIdentifier`** avec adaptateurs `selection` (parcours), `qr_nfc` (POC visite libre), `cv_photo` (MVP/lunettes).
- **POC : QR/NFC près du cartel** (scan = œuvre + salle), repli sélection manuelle si le musée refuse les étiquettes.
- **Localisation = niveau musée seulement** : GPS + SSID WiFi connu pour "tu es au Petit Palais". Pas de positionnement intra-musée par radio classique.
- **Point bleu / tracking continu = exploration ouverte, réactivable**, hors POC. Faisable sur téléphone via **géomagnétique** (~1m, sans caméra, sans hardware — juste un relevé) → ce n'est PAS une contrainte hardware, c'est un choix produit.

## Posture Megathon — 2026-06-20

Pour la démo, l'adaptateur primaire de `ArtworkIdentifier` devient
**ViroReact image tracking** dans l'app Expo React Native :

- ViroReact s'appuie sur ARKit côté iOS et ARCore côté Android.
- Les tracking targets viennent des `ref_image_url` préparées par le pipeline et
  des dimensions physiques `width_cm`/`height_cm`.
- Le point bleu est ancré sur l'oeuvre détectée.
- Le tap ouvre la vue détail 2D ; les hotspots sont ensuite des coordonnées sur
  l'image connue.
- **Pas de similarity search embeddings au runtime**. Les embeddings servent la
  story d'échelle/open-world post-hackathon.
- Fallbacks pré-décidés : sélection manuelle, QR par oeuvre, puis overlay 2D si
  l'ancrage AR est instable.

Go/no-go : le premier jalon frontend doit prouver un marqueur ViroReact sur un
iPhone physique et un Android physique. Si ViroReact bloque, on garde l'app
React Native et on remplace seulement l'adaptateur d'identification.

## Options considérées (positionnement)

| Option | Statut | Raison |
|---|---|---|
| GPS (musée) / SSID WiFi | **Retenu** | présence niveau musée |
| QR/NFC | **Retenu POC** | identification fiable, ~0€ |
| Géomagnétique (Oriient/IndoorAtlas) | **Candidat fort** | blue-dot téléphone, phone-less, zéro hardware |
| BLE beacons (Pointr/Situm) | **Candidat** | bonus geofence "œuvre proche → auto-trigger" |
| Visuel VPS (ARKit) | **Différé → lunettes** | exige caméra levée |
| UWB | **Rejeté POC/MVP** | infra coûteuse, réservé device loué premium |
| Ultrasons | **Rejeté** | niche |

## Conséquences

- (+) POC ne dépend que de QR/NFC (ou sélection) ; aucune dépendance positionnement.
- (+) Le blue-dot reste ouvert comme différenciateur "novateur" réactivable à tout moment.
