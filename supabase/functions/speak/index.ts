// POST /functions/v1/speak — text -> playable audio URL (ADR 0014).
//
// /generate stays text-only; this turns the final text into audio. The app gets a
// short playable URL (not base64) and keeps only its playback controls. The TTS key
// stays server-side.
//
// ponytail: STOPGAP provider. ElevenLabs (the intended TTS, ADR 0014) needs a key we
// don't have yet, so we use the KEYLESS Google Translate TTS: split the text into
// short chunks, fetch each MP3, concatenate (MP3 frames play back fine concatenated),
// upload to Storage, return the public URL. When ELEVENLABS_API_KEY lands, replace
// `synthesize()` with the ElevenLabs call — the contract and the upload/return path
// below do not change. Ceilings of the stopgap: robotic voice, ignores voice/speed/
// tone, ~no SSML, rate-limited.
//
// Request : { text, lang, voice?, speed?, tone? }
// Response: { audio_url, format, duration_s }

import { jsonResponse, preflight } from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { chunkText, googleTtsUrl, MAX_CHUNKS } from "./lib.ts";

const STORAGE_BUCKET = "artworks"; // public bucket; TTS files live under tts/

/**
 * Text -> MP3 bytes. ponytail: keyless Google TTS, chunked + concatenated.
 * Swap this body for an ElevenLabs call when ELEVENLABS_API_KEY is available.
 */
async function synthesize(text: string, lang: string): Promise<Uint8Array> {
  const chunks = chunkText(text).slice(0, MAX_CHUNKS);
  const parts: Uint8Array[] = [];
  for (const chunk of chunks) {
    const res = await fetch(googleTtsUrl(chunk, lang), {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`TTS ${res.status} on chunk`);
    parts.push(new Uint8Array(await res.arrayBuffer()));
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
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
  if (!text) return jsonResponse({ message: "text is required" }, 400);

  try {
    const audio_url = await uploadAudio(await synthesize(text, lang));
    // duration_s unknown without decoding the MP3 — left null (ponytail).
    return jsonResponse({ audio_url, format: "mp3", duration_s: null });
  } catch (e) {
    return jsonResponse({ message: `speak failed: ${e}` }, 502);
  }
});
