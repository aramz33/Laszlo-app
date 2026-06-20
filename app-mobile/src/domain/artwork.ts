export type Hotspot = {
  id: string;
  title: string;
  aspect: string;
  narrationText: string;
  audioUrl?: string | null;
  durationS?: number | null;
  x: number;
  y: number;
};

export type Notice = {
  id: string;
  lang: "en" | "nl" | string;
  source: "rijks" | "wikipedia" | string;
  text: string;
};

export type Artwork = {
  id: string;
  objectNumber: string;
  title: string;
  subtitle: string;
  location: string;
  widthCm: number;
  heightCm: number;
  imageUrl: string;
  refImageUrl: string;
  tags: string[];
  notices?: Notice[];
  hotspots: Hotspot[];
};
