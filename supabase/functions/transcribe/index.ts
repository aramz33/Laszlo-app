// POST /functions/v1/transcribe — speech -> text (ADR 0014).
//
// The visitor records audio in the app; this function forwards it to the STT
// provider (Scaleway, Voxtral by default) and returns plain text. The STT key
// stays server-side. Blocking step before /generate mode=ask for voice input.
//
// Request : multipart/form-data { audio: <file>, lang_hint?: "fr|en|nl" }
// Response: { text, lang, duration_s }

import { MAX_AUDIO_BYTES, toTranscript } from "./lib.ts";

const SCW_BASE_URL = Deno.env.get("SCW_BASE_URL")!;
const SCW_API_KEY = Deno.env.get("SCW_API_KEY")!;
// Voxtral (Mistral, multilingual) per ADR 0014; override with SCW_STT_MODEL.
const STT_MODEL = Deno.env.get("SCW_STT_MODEL") ?? "voxtral-small-24b-2507";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return jsonResponse({ message: "POST only" }, 405);

  // Parse the multipart upload.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse({ message: "expected multipart/form-data" }, 400);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return jsonResponse({ message: "audio file is required" }, 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonResponse({ message: "audio too large (max 10 MB)" }, 413);
  }

  const langHint = (form.get("lang_hint") as string) || null;

  // Forward to the STT provider as the OpenAI-style transcription multipart.
  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "audio.wav");
  upstream.append("model", STT_MODEL);
  if (langHint) upstream.append("language", langHint);

  try {
    const res = await fetch(`${SCW_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SCW_API_KEY}` },
      body: upstream,
    });
    if (!res.ok) {
      return jsonResponse(
        { message: `STT ${res.status}: ${await res.text()}` },
        502,
      );
    }
    return jsonResponse(toTranscript(await res.json(), langHint));
  } catch (e) {
    return jsonResponse({ message: `STT call failed: ${e}` }, 502);
  }
});
