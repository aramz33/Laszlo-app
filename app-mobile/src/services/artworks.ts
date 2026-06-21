import type { Artwork, Hotspot } from "../domain/artwork";
import { sampleArtworks } from "../data/sampleArtworks";
import { hasSupabaseConfig, supabase } from "./supabase";

type ArtistRow = {
  name: string | null;
  birth_year: number | null;
  death_year: number | null;
};

type MuseumRow = {
  name: string | null;
  city: string | null;
};

type HotspotRow = {
  id: string;
  x: number | null;
  y: number | null;
  title: string | null;
  aspect: string | null;
  narration_text: string | null;
  audio_url: string | null;
  duration_s: number | null;
  ord: number | null;
};

type ArtworkRow = {
  id: string;
  object_number: string;
  title_en: string | null;
  title_nl: string | null;
  year: number | null;
  height_cm: number | null;
  width_cm: number | null;
  image_url: string | null;
  ref_image_url: string | null;
  tags: string[] | null;
  artist: ArtistRow | null;
  museum: MuseumRow | null;
  hotspot: HotspotRow[] | null;
};

const ARTWORK_SELECT =
  "id,object_number,title_en,title_nl,year,height_cm,width_cm,image_url,ref_image_url,tags," +
  "artist(name,birth_year,death_year)," +
  "museum(name,city)," +
  "hotspot(id,x,y,title,aspect,narration_text,audio_url,duration_s,ord)";

const TITLE_FIXES: Record<string, { title_en: string; title_nl: string }> = {
  "SK-A-2344": { title_en: "The Milkmaid", title_nl: "Het melkmeisje" },
  "SK-C-5": { title_en: "The Night Watch", title_nl: "De Nachtwacht" },
};

function cleanTitle(value: string | null | undefined): string | null {
  const title = value?.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return title || null;
}

function buildSubtitle(row: ArtworkRow): string {
  const parts: string[] = [];
  if (row.artist?.name) {
    parts.push(row.artist.name);
  }
  if (row.year) {
    parts.push(String(row.year));
  }
  return parts.join(" · ");
}

function buildLocation(row: ArtworkRow): string {
  const parts: string[] = [];
  if (row.museum?.name) {
    parts.push(row.museum.name);
  }
  if (row.museum?.city) {
    parts.push(row.museum.city);
  }
  return parts.join(" · ");
}

function mapHotspot(row: HotspotRow): Hotspot {
  return {
    id: row.id,
    title: row.title ?? "",
    aspect: row.aspect ?? "",
    narrationText: row.narration_text ?? "",
    x: row.x ?? 0.5,
    y: row.y ?? 0.5
  };
}

function buildTitles(row: ArtworkRow) {
  const fix = TITLE_FIXES[row.object_number];
  const englishTitle = cleanTitle(fix?.title_en ?? row.title_en);
  const originalTitle =
    cleanTitle(fix?.title_nl ?? row.title_nl) ??
    englishTitle ??
    row.object_number;
  return {
    title: originalTitle,
    originalTitle,
    englishTitle: englishTitle === originalTitle ? "" : englishTitle ?? "",
  };
}

function mapArtwork(row: ArtworkRow): Artwork {
  const hotspots = (row.hotspot ?? [])
    .slice()
    .sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))
    .map(mapHotspot);

  return {
    id: row.id,
    objectNumber: row.object_number,
    ...buildTitles(row),
    subtitle: buildSubtitle(row),
    location: buildLocation(row),
    widthCm: row.width_cm ?? 0,
    heightCm: row.height_cm ?? 0,
    imageUrl: row.image_url ?? row.ref_image_url ?? "",
    refImageUrl: row.ref_image_url ?? "",
    tags: row.tags ?? [],
    hotspots
  };
}

/**
 * Loads trackable artworks (those with an AR reference image) joined to their
 * artist, museum and hotspots, mapped onto the app domain type. Falls back to
 * the bundled flagship sample when Supabase is not configured yet.
 */
export async function fetchArtworks(): Promise<Artwork[]> {
  if (!hasSupabaseConfig || !supabase) {
    return sampleArtworks;
  }

  const { data, error } = await supabase
    .from("artwork")
    .select(ARTWORK_SELECT)
    .not("ref_image_url", "is", null)
    .order("object_number", { ascending: true });

  if (error) {
    throw new Error(`Failed to load artworks: ${error.message}`);
  }

  return (data as unknown as ArtworkRow[]).map(mapArtwork);
}
