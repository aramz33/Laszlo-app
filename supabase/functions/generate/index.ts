// POST /functions/v1/generate — runtime texte de Laszlo (ADR 0014).
// 4 modes : hotspot (batch JSON) · ask (SSE) · persona (JSON) · followups (JSON).
// Le grounding (notices) est relu server-side ; le client n'envoie jamais les notices.
//
// ponytail: le LLM est STUBBÉ (helpers stub* dans lib.ts). Swap pour un client
// OpenAI-compatible (base_url + clé via env) quand LLM_API_KEY arrive dans .env —
// le contrat HTTP ne bouge pas. Parsing, grounding, SSE et formes de réponse sont réels.

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type HotspotRow,
  type NoticeRow,
  noticesToSources,
  stubAskText,
  stubFollowups,
  stubHotspotText,
  stubPersona,
} from "./lib.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

function db() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
}

async function readNotices(artwork_id: string): Promise<NoticeRow[]> {
  const { data } = await db()
    .from("notice")
    .select("id, lang, source, text")
    .eq("artwork_id", artwork_id);
  return (data ?? []) as NoticeRow[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ message: "POST only" }, 405);

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ message: "invalid JSON" }, 400);
  }

  const { mode, request_id = null, lang = "fr", artwork_id } = body;

  // --- persona : pas de grounding, juste l'onboarding ---
  if (mode === "persona") {
    return json({
      type: "done",
      request_id,
      persona_summary: stubPersona(body.onboarding ?? {}, lang),
    });
  }

  if (!artwork_id) return json({ message: "artwork_id requis" }, 400);
  const notices = await readNotices(artwork_id);
  const sources = noticesToSources(notices);

  // --- hotspot : batch JSON ---
  if (mode === "hotspot") {
    const ids: string[] = body.hotspot_ids ?? [];
    const { data } = await db()
      .from("hotspot")
      .select("id, title, aspect, narration_text")
      .in("id", ids);
    const rows = (data ?? []) as HotspotRow[];
    const items = ids.map((id) => {
      const h = rows.find((r) => r.id === id);
      return h
        ? { hotspot_id: id, status: "ready", text: stubHotspotText(h, lang), message: null, sources }
        : { hotspot_id: id, status: "error", text: null, message: "hotspot introuvable", sources: [] };
    });
    return json({ type: "done", request_id, items });
  }

  // --- followups : 3 questions JSON ---
  if (mode === "followups") {
    return json({ type: "done", request_id, questions: stubFollowups(lang) });
  }

  // --- ask : SSE streamé ---
  if (mode === "ask") {
    const question: string = body.question ?? "";
    const text = stubAskText(question, lang, notices.length);
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (o: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
        // ponytail: découpage par mots = simulation du stream LLM ; remplacé par le vrai stream.
        for (const w of text.split(" ")) {
          send({ type: "delta", request_id, delta: w + " " });
          await new Promise((r) => setTimeout(r, 30));
        }
        send({ type: "done", request_id, text, sources });
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  return json({ message: `mode inconnu: ${mode}` }, 400);
});
