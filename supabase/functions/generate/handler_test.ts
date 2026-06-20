// deno test supabase/functions/generate/handler_test.ts
// Behavior of /generate through its public surface: a Request in, a Response out.
// External boundaries (DB reads, LLM) are injected, so every scenario runs offline.

import { assert, assertEquals } from "jsr:@std/assert@1";
import { type GenerateDeps, handle } from "./index.ts";

const post = (payload: unknown) =>
  new Request("http://t/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

/** Happy-path fakes; override per test. */
function deps(over: Partial<GenerateDeps> = {}): GenerateDeps {
  return {
    readNotices: () =>
      Promise.resolve([{
        id: "n1",
        lang: "en",
        source: "rijks",
        text: "fact",
      }]),
    readHotspots: (ids) =>
      Promise.resolve(
        ids.map((id) => ({
          id,
          title: "T",
          aspect: "A",
          narration_text: "seed",
        })),
      ),
    complete: () => Promise.resolve("LLM TEXT"),
    // deno-lint-ignore require-yield
    streamDeltas: async function* () {
      yield "Hel";
      yield "lo";
    },
    ...over,
  };
}

const failing = () => Promise.reject(new Error("provider down"));

// --- routing / validation ---------------------------------------------------

Deno.test("OPTIONS preflight returns 200", async () => {
  const res = await handle(
    new Request("http://t/generate", { method: "OPTIONS" }),
    deps(),
  );
  assertEquals(res.status, 200);
});

Deno.test("non-POST is rejected", async () => {
  const res = await handle(
    new Request("http://t/generate", { method: "GET" }),
    deps(),
  );
  assertEquals(res.status, 405);
});

Deno.test("invalid JSON -> 400", async () => {
  const req = new Request("http://t/generate", {
    method: "POST",
    body: "{not json",
  });
  assertEquals((await handle(req, deps())).status, 400);
});

Deno.test("unknown mode -> 400", async () => {
  assertEquals(
    (await handle(post({ mode: "nope", artwork_id: "a" }), deps())).status,
    400,
  );
});

Deno.test("grounded mode without artwork_id -> 400", async () => {
  assertEquals(
    (await handle(post({ mode: "ask", question: "x" }), deps())).status,
    400,
  );
});

// --- persona ----------------------------------------------------------------

Deno.test("persona returns the model summary", async () => {
  const res = await handle(
    post({ mode: "persona", onboarding: { allure: "court" } }),
    deps(),
  );
  const body = await res.json();
  assertEquals(body.type, "done");
  assertEquals(body.persona_summary, "LLM TEXT");
});

Deno.test("persona falls back to a stub when the model fails", async () => {
  const res = await handle(
    post({ mode: "persona", lang: "fr", onboarding: { allure: "court" } }),
    deps({ complete: failing }),
  );
  const body = await res.json();
  assert(body.persona_summary.includes("persona"), body.persona_summary);
});

// --- hotspot ----------------------------------------------------------------

Deno.test("hotspot returns ready items with grounded sources", async () => {
  const res = await handle(
    post({ mode: "hotspot", artwork_id: "a", hotspot_ids: ["h1"] }),
    deps(),
  );
  const { items } = await res.json();
  assertEquals(items[0].status, "ready");
  assertEquals(items[0].text, "LLM TEXT");
  assertEquals(items[0].sources.length, 1);
});

Deno.test("hotspot marks unknown ids as error", async () => {
  const res = await handle(
    post({ mode: "hotspot", artwork_id: "a", hotspot_ids: ["missing"] }),
    deps({ readHotspots: () => Promise.resolve([]) }),
  );
  const { items } = await res.json();
  assertEquals(items[0].status, "error");
  assertEquals(items[0].text, null);
});

Deno.test("hotspot falls back to the seed text when the model fails", async () => {
  const res = await handle(
    post({ mode: "hotspot", artwork_id: "a", hotspot_ids: ["h1"] }),
    deps({ complete: failing }),
  );
  const { items } = await res.json();
  assertEquals(items[0].status, "ready"); // demo must still show something
  assertEquals(items[0].text, "seed");
});

// --- followups --------------------------------------------------------------

Deno.test("followups parses the model's lines", async () => {
  const res = await handle(
    post({ mode: "followups", artwork_id: "a" }),
    deps({ complete: () => Promise.resolve("Q1?\nQ2?\nQ3?") }),
  );
  const { questions } = await res.json();
  assertEquals(questions, ["Q1?", "Q2?", "Q3?"]);
});

Deno.test("followups falls back to stubs when the model fails", async () => {
  const res = await handle(
    post({ mode: "followups", artwork_id: "a" }),
    deps({ complete: failing }),
  );
  const { questions } = await res.json();
  assertEquals(questions.length, 3);
});

// --- ask (SSE) --------------------------------------------------------------

Deno.test("ask streams delta events then a done with the full text", async () => {
  const res = await handle(
    post({ mode: "ask", artwork_id: "a", question: "why?" }),
    deps(),
  );
  assertEquals(res.headers.get("Content-Type"), "text/event-stream");
  const body = await res.text();
  assert(body.includes('"type":"delta"'));
  assert(body.includes('"type":"done"'));
  assert(body.includes('"text":"Hello"'));
});

Deno.test("ask emits an error event when the stream fails before any token", async () => {
  const res = await handle(
    post({ mode: "ask", artwork_id: "a", question: "why?" }),
    deps({
      // deno-lint-ignore require-yield
      streamDeltas: async function* () {
        throw new Error("boom");
      },
    }),
  );
  const body = await res.text();
  assert(body.includes('"type":"error"'), body);
});
