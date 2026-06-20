export type Hotspot = {
  id: string;
  title: string;
  aspect: string;
  narrationText: string;
  x: number;
  y: number;
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
  hotspots: Hotspot[];
};
