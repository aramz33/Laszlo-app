import type { Artwork } from "../domain/artwork";

/**
 * Two "phares" (lighthouse artworks) for the demo:
 * La Laitière (SK-A-2344) and La Ronde de nuit (SK-C-5).
 */
export const demoArtworks: Artwork[] = [
  {
    id: "sk-a-2344",
    objectNumber: "SK-A-2344",
    title: "La Laitière",
    subtitle: "Johannes Vermeer, c. 1660",
    location: "Gallery 2.6 · Rijksmuseum",
    widthCm: 41,
    heightCm: 45.5,
    imageUrl:
      "https://iiif.micr.io/eXRFd/full/800,/0/default.jpg",
    refImageUrl:
      "https://spbrkgoseabpsxzkkyzj.supabase.co/storage/v1/object/public/artworks/ref/SK-A-2344.jpg",
    tags: ["vermeer", "genre", "golden-age"],
    hotspots: [
      {
        id: "h1-milk",
        title: "The thread of milk",
        aspect: "technique",
        narrationText:
          "Vermeer painted the stream of milk with tiny dots of impasto — lead white applied with the tip of the brush so it catches the light like real liquid catching the window.",
        x: 0.52,
        y: 0.58
      },
      {
        id: "h2-light",
        title: "Window light",
        aspect: "composition",
        narrationText:
          "The light enters from the upper left. Vermeer used a camera obscura effect — the soft halo on the bread basket is an out-of-focus highlight, centuries before photography existed.",
        x: 0.18,
        y: 0.22
      },
      {
        id: "h3-bread",
        title: "The bread basket",
        aspect: "symbolism",
        narrationText:
          "Broken bread on the table. In Dutch still-life tradition, bread signals nourishment and domesticity. Vermeer elevates an everyday act into something monumental.",
        x: 0.62,
        y: 0.78
      },
      {
        id: "h4-wall",
        title: "The bare wall",
        aspect: "context",
        narrationText:
          "X-ray analysis revealed Vermeer painted over a wall map and a basket hanging on the wall — choosing simplicity to keep the viewer focused on the woman.",
        x: 0.82,
        y: 0.35
      }
    ]
  },
  {
    id: "sk-c-5",
    objectNumber: "SK-C-5",
    title: "La Ronde de nuit",
    subtitle: "Rembrandt van Rijn, 1642",
    location: "Gallery of Honour · Rijksmuseum",
    widthCm: 437,
    heightCm: 363,
    imageUrl:
      "https://iiif.micr.io/MXqcR/full/800,/0/default.jpg",
    refImageUrl:
      "https://spbrkgoseabpsxzkkyzj.supabase.co/storage/v1/object/public/artworks/ref/SK-C-5.jpg",
    tags: ["rembrandt", "group-portrait", "golden-age"],
    hotspots: [
      {
        id: "h5-captain",
        title: "Captain's gesture",
        aspect: "composition",
        narrationText:
          "Captain Banning Cocq's outstretched hand creates depth — its shadow falls on the lieutenant's coat, proving the light is theatrical, not natural.",
        x: 0.42,
        y: 0.48
      },
      {
        id: "h6-girl",
        title: "The luminous girl",
        aspect: "symbolism",
        narrationText:
          "A small girl in gold carries a chicken with prominent claws — a visual pun on the militia's emblem (klover = claw). She glows because Rembrandt lit her to anchor the viewer's eye.",
        x: 0.38,
        y: 0.55
      },
      {
        id: "h7-light",
        title: "Chiaroscuro staging",
        aspect: "technique",
        narrationText:
          "Unlike flat group portraits of the time, Rembrandt staged the scene with dramatic light and shadow — turning a commission into a theatrical event.",
        x: 0.55,
        y: 0.32
      },
      {
        id: "h8-cut",
        title: "The missing edges",
        aspect: "context",
        narrationText:
          "The painting was cut on all four sides in 1715 to fit a smaller wall. Two figures on the left were lost entirely — we know from a 1642 copy by Gerrit Lundens.",
        x: 0.08,
        y: 0.5
      }
    ]
  }
];
