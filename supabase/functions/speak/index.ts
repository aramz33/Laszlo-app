// POST /functions/v1/speak — text -> playable audio URL (ADR 0014).
//
// /generate stays text-only; this turns the final text into audio. The app gets a
// short playable URL (not base64) and keeps only its playback controls. The TTS key
// stays server-side.
//
// ponytail: KEYLESS providers (no ElevenLabs key yet). Primary = Microsoft Edge neural
// voices (good quality, no length limit); fallback = Google Translate TTS (robotic but
// rock-stable). When ELEVENLABS_API_KEY lands, add an ElevenLabs branch at the top of
// `synthesize()` — the upload/return path and the contract below do not change.
// Current ceiling: `voice`/`tone` are ignored; `speed` is honored by the Edge path only.
//
// Request : { text, lang, voice?, speed?, tone? }
// Response: { audio_url, format, duration_s }

import { jsonResponse, preflight } from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { edgeTts } from "./edgetts.ts";
import { chunkText, googleTtsUrl, MAX_CHUNKS } from "./lib.ts";

const STORAGE_BUCKET = "artworks"; // public bucket; TTS files live under tts/

/** Text -> MP3 bytes. Try Edge neural TTS first, fall back to Google on any failure. */
async function synthesize(
  text: string,
  lang: string,
  speed: number,
): Promise<Uint8Array> {
  try {
    return await edgeTts(text, lang, speed);
  } catch {
    return await googleTts(text, lang);
  }
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
  if (!text) return jsonResponse({ message: "text is required" }, 400);

  try {
    const audio_url = await uploadAudio(await synthesize(text, lang, speed));
    // duration_s unknown without decoding the MP3 — left null (ponytail).
    return jsonResponse({ audio_url, format: "mp3", duration_s: null });
  } catch (e) {
    return jsonResponse({ message: `speak failed: ${e}` }, 502);
  }
});
