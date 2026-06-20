import { demoArtworks } from "../data/demoArtworks";
import type { Artwork, Hotspot, Notice } from "../domain/artwork";
import { hasSupabaseConfig, supabase } from "./supabase";

export type ArtworkDataSource = "supabase" | "demo";

type HotspotRow = {
  id: string;
  title: string;
  aspect: string | null;
  narration_text: string;
  audio_url: string | null;
  duration_s: number | string | null;
  ord: number;
  x: number | string;
  y: number | string;
};

type NoticeRow = {
  id: string;
  lang: string;
  source: string;
  text: string;
};

type ArtworkRow = {
  id: string;
  object_number: string;
  title_en: string | null;
  title_nl: string | null;
  year: number | null;
  height_cm: number | string | null;
  width_cm: number | string | null;
  image_url: string | null;
  ref_image_url: string | null;
  tags: unknown;
  notice: NoticeRow[] | null;
  hotspot: HotspotRow[] | null;
};

export type LoadArtworksResult = {
  artworks: Artwork[];
  source: ArtworkDataSource;
  error?: string;
};

const numberOrZero = (value: number | string | null) => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? Number(parsed) : 0;
};

const tagsFrom = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string")
    : [];

function mapHotspot(row: HotspotRow): Hotspot {
  return {
    id: row.id,
    title: row.title,
    aspect: row.aspect ?? "attention",
    narrationText: row.narration_text,
    audioUrl: row.audio_url,
    durationS: row.duration_s === null ? null : numberOrZero(row.duration_s),
    x: numberOrZero(row.x),
    y: numberOrZero(row.y),
  };
}

function mapNotice(row: NoticeRow): Notice {
  return {
    id: row.id,
    lang: row.lang,
    source: row.source,
    text: row.text,
  };
}

function mapArtwork(row: ArtworkRow): Artwork | null {
  if (!row.image_url || !row.ref_image_url) {
    return null;
  }

  const hotspots = [...(row.hotspot ?? [])]
    .sort((a, b) => a.ord - b.ord)
    .map(mapHotspot);

  return {
    id: row.id,
    objectNumber: row.object_number,
    title: row.title_en ?? row.title_nl ?? row.object_number,
    subtitle: row.year ? `Rijksmuseum, ${row.year}` : "Rijksmuseum",
    location: "Rijksmuseum",
    widthCm: numberOrZero(row.width_cm),
    heightCm: numberOrZero(row.height_cm),
    imageUrl: row.image_url,
    refImageUrl: row.ref_image_url,
    tags: tagsFrom(row.tags),
    notices: (row.notice ?? []).map(mapNotice),
    hotspots,
  };
}

export async function loadFeaturedArtworks(): Promise<LoadArtworksResult> {
  if (!hasSupabaseConfig || !supabase) {
    return { artworks: demoArtworks, source: "demo" };
  }

  try {
    // Every tracked work (ref image + hotspots) shows up; corpus grows as the
    // pipeline loads more, no app change needed.
    const { data, error } = await supabase
      .from("artwork")
      .select(
        "id,object_number,title_en,title_nl,year,height_cm,width_cm,image_url,ref_image_url,tags,notice(id,lang,source,text),hotspot(id,title,aspect,narration_text,audio_url,duration_s,ord,x,y)",
      )
      .not("ref_image_url", "is", null);

    if (error) {
      return { artworks: demoArtworks, source: "demo", error: error.message };
    }

    const mapped = ((data ?? []) as ArtworkRow[])
      .map(mapArtwork)
      .filter((artwork): artwork is Artwork => Boolean(artwork))
      .sort((a, b) => a.objectNumber.localeCompare(b.objectNumber));

    return mapped.length > 0
      ? { artworks: mapped, source: "supabase" }
      : {
          artworks: demoArtworks,
          source: "demo",
          error: "No featured artworks returned.",
        };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Supabase request failed.";
    return { artworks: demoArtworks, source: "demo", error: message };
  }
}
