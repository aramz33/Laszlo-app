import type { Artwork } from "../domain/artwork";

const storageBase =
  "https://spbrkgoseabpsxzkkyzj.supabase.co/storage/v1/object/public/artworks";

export const demoArtworks: Artwork[] = [
  {
    id: "SK-C-5",
    objectNumber: "SK-C-5",
    title: "De Nachtwacht",
    originalTitle: "De Nachtwacht",
    englishTitle: "The Night Watch",
    subtitle: "Rembrandt van Rijn, 1642",
    location: "Night Watch Gallery",
    widthCm: 453.5,
    heightCm: 379.5,
    imageUrl: `${storageBase}/hd/SK-C-5.jpg`,
    refImageUrl: `${storageBase}/ref/SK-C-5.jpg`,
    tags: ["group portrait", "Amsterdam", "light", "militia"],
    hotspots: [
      {
        id: "sk-c-5-captain",
        title: "The captain's gesture",
        aspect: "composition",
        narrationText:
          "The captain's extended hand turns the group portrait into a moving scene.",
        x: 0.47,
        y: 0.42
      },
      {
        id: "sk-c-5-girl",
        title: "The golden girl",
        aspect: "symbol",
        narrationText:
          "The bright figure carries clues that point back to the militia company.",
        x: 0.57,
        y: 0.56
      }
    ]
  },
  {
    id: "SK-A-2344",
    objectNumber: "SK-A-2344",
    title: "Het melkmeisje",
    originalTitle: "Het melkmeisje",
    englishTitle: "The Milkmaid",
    subtitle: "Johannes Vermeer, c. 1660",
    location: "Gallery of Honour",
    widthCm: 41,
    heightCm: 45.5,
    imageUrl: `${storageBase}/hd/SK-A-2344.jpg`,
    refImageUrl: `${storageBase}/ref/SK-A-2344.jpg`,
    tags: ["daily life", "light", "stillness", "Vermeer"],
    hotspots: [
      {
        id: "sk-a-2344-milk",
        title: "The stream of milk",
        aspect: "attention",
        narrationText:
          "Vermeer slows the scene down by making the small stream of milk the center of gravity.",
        x: 0.49,
        y: 0.54
      },
      {
        id: "sk-a-2344-light",
        title: "Window light",
        aspect: "technique",
        narrationText:
          "The window light gives the kitchen its quiet structure and soft focus.",
        x: 0.24,
        y: 0.25
      }
    ]
  }
];
