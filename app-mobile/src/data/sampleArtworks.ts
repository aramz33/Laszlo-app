import type { Artwork } from "../domain/artwork";

/**
 * Offline development fallback used only when Supabase is not configured
 * (no EXPO_PUBLIC_SUPABASE_ANON_KEY). It covers the two demo flagships so the
 * app is runnable on-device before the key is wired. Real data from Supabase
 * (including the hand-authored hotspots) takes precedence once configured.
 */
const STORAGE_REF =
  "https://spbrkgoseabpsxzkkyzj.supabase.co/storage/v1/object/public/artworks/ref";

export const sampleArtworks: Artwork[] = [
  {
    id: "sample-SK-C-5",
    objectNumber: "SK-C-5",
    title: "De Nachtwacht",
    originalTitle: "De Nachtwacht",
    englishTitle: "The Night Watch",
    subtitle: "Rembrandt van Rijn · 1642",
    location: "Rijksmuseum · Amsterdam",
    widthCm: 453.5,
    heightCm: 379.5,
    imageUrl: `${STORAGE_REF}/SK-C-5.jpg`,
    refImageUrl: `${STORAGE_REF}/SK-C-5.jpg`,
    tags: ["baroque", "group portrait", "militia"],
    hotspots: [
      {
        id: "sample-SK-C-5-captain",
        title: "Captain Frans Banninck Cocq",
        aspect: "composition",
        narrationText:
          "The militia captain in black, his red sash crossing his chest, gestures forward at the centre of the company.",
        x: 0.42,
        y: 0.55
      },
      {
        id: "sample-SK-C-5-lieutenant",
        title: "Lieutenant in yellow",
        aspect: "colour",
        narrationText:
          "Lieutenant Willem van Ruytenburch, dressed in pale yellow, catches the light beside the captain.",
        x: 0.55,
        y: 0.6
      },
      {
        id: "sample-SK-C-5-girl",
        title: "The girl in gold",
        aspect: "symbolism",
        narrationText:
          "A brightly lit girl carries a dead chicken at her waist, its claws a likely emblem of the militia company.",
        x: 0.32,
        y: 0.5
      },
      {
        id: "sample-SK-C-5-light",
        title: "Light and movement",
        aspect: "technique",
        narrationText:
          "Rembrandt breaks with the static group portrait, using dramatic light and shadow to set the company in motion.",
        x: 0.5,
        y: 0.32
      }
    ]
  },
  {
    id: "sample-SK-A-2344",
    objectNumber: "SK-A-2344",
    title: "Het melkmeisje",
    originalTitle: "Het melkmeisje",
    englishTitle: "The Milkmaid",
    subtitle: "Johannes Vermeer · c. 1660",
    location: "Rijksmuseum · Amsterdam",
    widthCm: 41,
    heightCm: 45.5,
    imageUrl: `${STORAGE_REF}/SK-A-2344.jpg`,
    refImageUrl: `${STORAGE_REF}/SK-A-2344.jpg`,
    tags: ["dutch golden age", "genre", "interior"],
    hotspots: [
      {
        id: "sample-SK-A-2344-milk",
        title: "The stream of milk",
        aspect: "technique",
        narrationText:
          "The thin stream of milk pouring into the bowl is the still, suspended heart of the painting.",
        x: 0.46,
        y: 0.55
      },
      {
        id: "sample-SK-A-2344-bread",
        title: "Bread and still life",
        aspect: "detail",
        narrationText:
          "Crusty bread and earthenware on the table are rendered with stippled highlights that catch the light.",
        x: 0.35,
        y: 0.62
      },
      {
        id: "sample-SK-A-2344-window",
        title: "Light from the window",
        aspect: "light",
        narrationText:
          "Daylight enters from the left window, modelling the maid's form and the bare plaster wall behind her.",
        x: 0.2,
        y: 0.35
      },
      {
        id: "sample-SK-A-2344-footwarmer",
        title: "Foot warmer and tiles",
        aspect: "symbolism",
        narrationText:
          "A foot warmer and Delft wall tiles sit at the lower right, domestic details charged with quiet meaning.",
        x: 0.62,
        y: 0.85
      }
    ]
  }
];
