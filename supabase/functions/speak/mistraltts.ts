// Mistral TTS (voxtral-mini-tts). Needs MISTRAL_API_KEY.
// POST /v1/audio/speech -> { audio_data: "<base64 mp3>" }.
//
// Note: Mistral's TTS voices are English-only right now (en_us / en_gb). It will read
// other-language text, but with an English voice/accent. Pick another engine for clean
// FR/NL audio (Edge has native voices).

import { decodeBase64 } from "jsr:@std/encoding@1/base64";

const KEY = Deno.env.get("MISTRAL_API_KEY");
const MODEL = Deno.env.get("MISTRAL_TTS_MODEL") ?? "voxtral-mini-tts-2603";
const VOICE = Deno.env.get("MISTRAL_TTS_VOICE") ?? "en_paul_neutral";

/** Synthesize `text` to MP3 bytes via Mistral. Throws if the key is missing or the call fails. */
export async function mistralTts(text: string): Promise<Uint8Array> {
  if (!KEY) throw new Error("MISTRAL_API_KEY not set");
  const res = await fetch("https://api.mistral.ai/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: text, voice: VOICE }),
  });
  if (!res.ok) {
    throw new Error(`mistral tts ${res.status}: ${await res.text()}`);
  }
  const { audio_data } = await res.json();
  return decodeBase64(audio_data);
}
