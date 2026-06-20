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

import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { jsonResponse, preflight } from "../_shared/http.ts";
import { anonClient } from "../_shared/supabase.ts";
import {
  type CandidateRow,
  MAX_IMAGE_BYTES,
  resolveMatch,
  visionPrompt,
} from "./lib.ts";

const SCW_BASE_URL = Deno.env.get("SCW_BASE_URL")!;
const SCW_API_KEY = Deno.env.get("SCW_API_KEY")!;
// Pixtral (multimodal) per ADR 0014; override with SCW_VISION_MODEL (holo2 also available).
const VISION_MODEL = Deno.env.get("SCW_VISION_MODEL") ?? "pixtral-12b-2409";

/** Read candidate artworks. If ids are given, scope to them; else the trackable set. */
async function readCandidates(ids: string[]): Promise<CandidateRow[]> {
  let query = anonClient().from("artwork").select(
    "id, object_number, title_en, title_nl, year, artist(name)",
  );
  query = ids.length > 0
    ? query.in("id", ids)
    : query.not("ref_image_url", "is", null);
  const { data } = await query;
  // supabase-js infers the to-one `artist` join as an array; at runtime PostgREST
  // returns a single object (verified e2e), so cast through unknown.
  return (data ?? []) as unknown as CandidateRow[];
}

Deno.serve(async (req) => {
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

  const candidates = await readCandidates(ids);
  if (candidates.length === 0) {
    return jsonResponse({ artwork_id: null, confidence: 0, candidates: null });
  }

  // Encode the photo as a data URL for the vision model.
  const bytes = new Uint8Array(await image.arrayBuffer());
  const dataUrl = `data:${image.type || "image/jpeg"};base64,${
    encodeBase64(bytes)
  }`;

  try {
    const res = await fetch(`${SCW_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SCW_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: visionPrompt(candidates) },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
      }),
    });
    if (!res.ok) {
      return jsonResponse({
        message: `vision ${res.status}: ${await res.text()}`,
      }, 502);
    }
    const reply = (await res.json()).choices?.[0]?.message?.content ?? "";
    return jsonResponse(resolveMatch(reply, candidates.map((c) => c.id)));
  } catch (e) {
    return jsonResponse({ message: `vision call failed: ${e}` }, 502);
  }
});
