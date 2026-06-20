import type { Artwork } from "./artwork";

export type IdentificationSource = "viro" | "manual" | "qr";

export type ArtworkIdentification = {
  artwork: Artwork;
  source: IdentificationSource;
  confidence?: number;
};

export type IdentifyArtwork = (identification: ArtworkIdentification) => void;
