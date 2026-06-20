// POST /functions/v1/identify — image -> artwork_id (ADR 0014).
//
// Fallback for when ViroReact AR fails to recognize a painting: the app sends a
// camera frame, a vision model picks which of the candidate artworks it shows, and
// the app opens the same detail view in a 2D overlay. Vision key stays server-side.
//
// No embeddings (out of runtime, post-hackathon): we send the photo + the candidate
// list (works already loaded for the room) and let the model choose. Fine for a
// curated set of well-known works; embeddings would be needed for open-world.
//
// Request : multipart/form-data { image: <file>, candidate_ids?: csv|repeated, lang_hint? }
// Response: { artwork_id, confidence, candidates }
//
// `handle(req, deps)` holds parsing/validation/matching; the DB read and vision call
// are injected via `deps` so tests cover every scenario offline.

import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { jsonResponse, preflight } from "../_shared/http.ts";
import { anonClient } from "../_shared/supabase.ts";
import {
  type CandidateRow,
  MAX_IMAGE_BYTES,
  resolveMatch,
  visionPrompt,
} from "./lib.ts";

export type IdentifyDeps = {
  readCandidates: (ids: string[]) => Promise<CandidateRow[]>;
  /** Ask the vision model which candidate the photo shows; returns its raw reply. */
  vision: (dataUrl: string, prompt: string) => Promise<string>;
};

export const realDeps: IdentifyDeps = {
  async readCandidates(ids) {
    let query = anonClient().from("artwork")
      .select("id, object_number, title_en, title_nl, year, artist(name)");
    query = ids.length > 0
      ? query.in("id", ids)
      : query.not("ref_image_url", "is", null);
    const { data } = await query;
    // supabase-js infers the to-one `artist` join as an array; at runtime PostgREST
    // returns a single object (verified e2e), so cast through unknown.
    return (data ?? []) as unknown as CandidateRow[];
  },
  async vision(dataUrl, prompt) {
    const base = Deno.env.get("SCW_BASE_URL")!;
    const key = Deno.env.get("SCW_API_KEY")!;
    const model = Deno.env.get("SCW_VISION_MODEL") ?? "pixtral-12b-2409";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`vision ${res.status}: ${await res.text()}`);
    return (await res.json()).choices?.[0]?.message?.content ?? "";
  },
};

export async function handle(
  req: Request,
  deps: IdentifyDeps,
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

  const image = form.get("image");
  if (!(image instanceof File)) {
    return jsonResponse({ message: "image file is required" }, 400);
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return jsonResponse({ message: "image too large (max 10 MB)" }, 413);
  }

  // candidate_ids: accept a CSV value and/or repeated fields; empty => trackable set.
  const ids = form.getAll("candidate_ids")
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter(Boolean);

  const candidates = await deps.readCandidates(ids);
  if (candidates.length === 0) {
    return jsonResponse({ artwork_id: null, confidence: 0, candidates: null });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const dataUrl = `data:${image.type || "image/jpeg"};base64,${
    encodeBase64(bytes)
  }`;

  try {
    const reply = await deps.vision(dataUrl, visionPrompt(candidates));
    return jsonResponse(resolveMatch(reply, candidates.map((c) => c.id)));
  } catch (e) {
    return jsonResponse({ message: `vision call failed: ${e}` }, 502);
  }
}

if (import.meta.main) Deno.serve((req) => handle(req, realDeps));
