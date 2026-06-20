// POST /functions/v1/speak — text -> playable audio URL (ADR 0014).
//
// /generate stays text-only; this turns the final text into audio. The app gets a
// short playable URL (not base64) and keeps only its playback controls. The TTS key
// stays server-side.
//
// Engines (no ElevenLabs key yet — all selectable):
//   edge    — Microsoft Edge neural voices (keyless, native FR/NL/EN, default)
//   mistral — Mistral voxtral-mini-tts (needs MISTRAL_API_KEY; English voices only)
//   google  — Google Translate TTS (keyless, robotic; the safety net)
//
// Pick one per request with `provider`, or set a default with the TTS_PROVIDER env.
// "auto" (default) = edge then google. An explicit choice still falls back to edge→google
// so a demo never blanks. When ELEVENLABS_API_KEY lands, add an `elevenlabs` engine here.
//
// Request : { text, lang, provider?, voice?, speed?, tone? }
// Response: { audio_url, format, duration_s, engine }

import { jsonResponse, preflight } from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { edgeTts } from "./edgetts.ts";
import { mistralTts } from "./mistraltts.ts";
import { chunkText, googleTtsUrl, MAX_CHUNKS } from "./lib.ts";

const STORAGE_BUCKET = "artworks"; // public bucket; TTS files live under tts/

type Engine = "edge" | "mistral" | "google";

const ENGINES: Record<
  Engine,
  (text: string, lang: string, speed: number) => Promise<Uint8Array>
> = {
  edge: (t, l, s) => edgeTts(t, l, s),
  mistral: (t) => mistralTts(t),
  google: (t, l) => googleTts(t, l),
};

/**
 * Synthesize to MP3, choosing the engine. `provider` is the requested engine (or "auto");
 * we always keep edge→google as a fallback chain so an engine outage never breaks the demo.
 * Returns the bytes plus which engine actually produced them.
 */
async function synthesize(
  text: string,
  lang: string,
  speed: number,
  provider: string,
): Promise<{ bytes: Uint8Array; engine: Engine }> {
  const chosen: Engine[] = provider in ENGINES ? [provider as Engine] : [];
  const order = [...new Set<Engine>([...chosen, "edge", "google"])];
  let lastError: unknown;
  for (const engine of order) {
    try {
      return { bytes: await ENGINES[engine](text, lang, speed), engine };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/** Fallback: keyless Google TTS, chunked (~200 char cap) and concatenated. */
async function googleTts(text: string, lang: string): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for (const chunk of chunkText(text).slice(0, MAX_CHUNKS)) {
    const res = await fetch(googleTtsUrl(chunk, lang), {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`google TTS ${res.status}`);
    parts.push(new Uint8Array(await res.arrayBuffer()));
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Upload the audio to the public bucket and return its public URL. */
async function uploadAudio(bytes: Uint8Array): Promise<string> {
  const sb = serviceClient();
  const path = `tts/${crypto.randomUUID()}.mp3`;
  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType: "audio/mpeg",
    upsert: true,
  });
  if (error) throw error;
  return sb.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonResponse({ message: "POST only" }, 405);

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ message: "invalid JSON" }, 400);
  }

  const text: string = (body.text ?? "").trim();
  const lang: string = body.lang ?? "fr";
  const speed: number = typeof body.speed === "number" ? body.speed : 1;
  // Engine: per-request `provider`, else the TTS_PROVIDER env default, else "auto".
  const provider: string = body.provider ?? Deno.env.get("TTS_PROVIDER") ??
    "auto";
  if (!text) return jsonResponse({ message: "text is required" }, 400);

  try {
    const { bytes, engine } = await synthesize(text, lang, speed, provider);
    const audio_url = await uploadAudio(bytes);
    // duration_s unknown without decoding the MP3 — left null (ponytail).
    return jsonResponse({ audio_url, format: "mp3", duration_s: null, engine });
  } catch (e) {
    return jsonResponse({ message: `speak failed: ${e}` }, 502);
  }
});
