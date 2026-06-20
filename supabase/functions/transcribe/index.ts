// POST /functions/v1/transcribe — speech -> text (ADR 0014).
//
// The visitor records audio in the app; this function forwards it to the STT
// provider (Scaleway, Voxtral by default) and returns plain text. The STT key
// stays server-side. Blocking step before /generate mode=ask for voice input.
//
// Request : multipart/form-data { audio: <file>, lang_hint?: "fr|en|nl" }
// Response: { text, lang, duration_s }
//
// `handle(req, deps)` holds the parsing/validation; the STT call is injected via
// `deps.stt` so tests cover every scenario offline.

import { jsonResponse, preflight } from "../_shared/http.ts";
import { MAX_AUDIO_BYTES, toTranscript } from "./lib.ts";

export type Transcript = {
  text: string;
  lang: string | null;
  duration_s: number | null;
};
export type TranscribeDeps = {
  stt: (audio: File, langHint: string | null) => Promise<Transcript>;
};

export const realDeps: TranscribeDeps = {
  async stt(audio, langHint) {
    const base = Deno.env.get("SCW_BASE_URL")!;
    const key = Deno.env.get("SCW_API_KEY")!;
    const model = Deno.env.get("SCW_STT_MODEL") ?? "voxtral-small-24b-2507";
    const upstream = new FormData();
    upstream.append("file", audio, audio.name || "audio.wav");
    upstream.append("model", model);
    if (langHint) upstream.append("language", langHint);
    const res = await fetch(`${base}/audio/transcriptions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}` },
      body: upstream,
    });
    if (!res.ok) throw new Error(`STT ${res.status}: ${await res.text()}`);
    return toTranscript(await res.json(), langHint);
  },
};

export async function handle(
  req: Request,
  deps: TranscribeDeps,
): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonResponse({ message: "POST only" }, 405);

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
  try {
    return jsonResponse(await deps.stt(audio, langHint));
  } catch (e) {
    return jsonResponse({ message: `STT call failed: ${e}` }, 502);
  }
}

if (import.meta.main) Deno.serve((req) => handle(req, realDeps));
