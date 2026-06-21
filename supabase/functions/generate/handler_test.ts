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

// --- overview ---------------------------------------------------------------

Deno.test("overview returns the model intro with sources", async () => {
  const res = await handle(
    post({ mode: "overview", artwork_id: "a" }),
    deps(),
  );
  const body = await res.json();
  assertEquals(body.type, "done");
  assertEquals(body.text, "LLM TEXT");
  assertEquals(body.sources.length, 1);
});

Deno.test("overview falls back to a stub when the model fails", async () => {
  const res = await handle(
    post({ mode: "overview", artwork_id: "a", lang: "fr" }),
    deps({ complete: failing }),
  );
  const body = await res.json();
  assertEquals(body.type, "done");
  assert(body.text.includes("overview"), body.text);
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

// --- hotspot (additional) ---------------------------------------------------

Deno.test("hotspot with empty hotspot_ids returns an empty items array", async () => {
  const res = await handle(
    post({ mode: "hotspot", artwork_id: "a", hotspot_ids: [] }),
    deps(),
  );
  const body = await res.json();
  assertEquals(body.type, "done");
  assertEquals(body.items, []);
});

Deno.test("hotspot partial failure: one ok, one seed fallback", async () => {
  // First call succeeds; second throws → falls back to seed.
  let calls = 0;
  const res = await handle(
    post({ mode: "hotspot", artwork_id: "a", hotspot_ids: ["h1", "h2"] }),
    deps({
      complete: () => {
        if (++calls === 1) return Promise.resolve("LLM TEXT");
        return Promise.reject(new Error("down"));
      },
    }),
  );
  const { items } = await res.json();
  assertEquals(items.length, 2);
  assertEquals(items[0].status, "ready");
  assertEquals(items[0].text, "LLM TEXT");
  assertEquals(items[1].status, "ready"); // demo never blanks
  assertEquals(items[1].text, "seed"); // seed fallback
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

Deno.test("followups falls back to stubs when model returns empty output", async () => {
  // Model succeeds but returns blank text → parseFollowups → [] → stub kicks in.
  const res = await handle(
    post({ mode: "followups", artwork_id: "a" }),
    deps({ complete: () => Promise.resolve("") }),
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

Deno.test("ask emits done (not error) when stream fails after some tokens", async () => {
  // After at least one token has been emitted, the partial text is closed as done.
  const res = await handle(
    post({ mode: "ask", artwork_id: "a", question: "why?" }),
    deps({
      streamDeltas: async function* () {
        yield "partial";
        throw new Error("mid-stream failure");
      },
    }),
  );
  const body = await res.text();
  // Must have a done event carrying the partial text, not an error.
  assert(body.includes('"type":"done"'), body);
  assert(body.includes("partial"), body);
  assert(!body.includes('"type":"error"'), "should not emit error after partial text");
});

// --- grounding actually reaches the model (anti-hallucination contract) ------

Deno.test("grounding facts reach the LLM messages (not just the sources count)", async () => {
  // If grounding were dropped, every other test would still pass (complete ignores
  // its input) — so assert the notice text is actually in the prompt sent to the model.
  let captured: Array<{ role: string; content: string }> = [];
  await handle(
    post({ mode: "overview", artwork_id: "a" }),
    deps({
      readNotices: () =>
        Promise.resolve([{ id: "n1", lang: "en", source: "rijks", text: "MARKER_FACT_42" }]),
      complete: (messages) => {
        captured = messages as typeof captured;
        return Promise.resolve("ok");
      },
    }),
  );
  assert(
    captured.some((m) => m.content.includes("MARKER_FACT_42")),
    "notice text never reached the model prompt",
  );
});

Deno.test("EN-pivot: handler grounds and cites only the EN notices", async () => {
  let captured: Array<{ role: string; content: string }> = [];
  const res = await handle(
    post({ mode: "overview", artwork_id: "a" }),
    deps({
      readNotices: () =>
        Promise.resolve([
          { id: "en-r", lang: "en", source: "rijks", text: "EN_RIJKS" },
          { id: "nl-r", lang: "nl", source: "rijks", text: "NL_RIJKS" },
          { id: "en-w", lang: "en", source: "wikipedia", text: "EN_WIKI" },
          { id: "nl-w", lang: "nl", source: "wikipedia", text: "NL_WIKI_SHOULD_BE_DROPPED" },
        ]),
      complete: (messages) => {
        captured = messages as typeof captured;
        return Promise.resolve("ok");
      },
    }),
  );
  const body = await res.json();
  // sources: only the two EN notices, never the NL ones.
  assertEquals(body.sources.map((s: { notice_id: string }) => s.notice_id).sort(), [
    "en-r",
    "en-w",
  ]);
  // and the dropped NL content must not be in the prompt.
  const prompt = captured.map((m) => m.content).join(" ");
  assert(prompt.includes("EN_WIKI"), "EN grounding missing");
  assert(!prompt.includes("NL_WIKI_SHOULD_BE_DROPPED"), "NL notice leaked into grounding");
});

// --- per-request model override (dev only) ----------------------------------

Deno.test("body.model overrides the model passed to complete()", async () => {
  let usedModel: string | undefined = "UNSET";
  await handle(
    post({ mode: "overview", artwork_id: "a", model: "gemma-test" }),
    deps({
      complete: (_m, _t, model) => {
        usedModel = model;
        return Promise.resolve("ok");
      },
    }),
  );
  assertEquals(usedModel, "gemma-test");
});

Deno.test("no body.model -> complete() gets undefined (server default applies)", async () => {
  let usedModel: string | undefined = "UNSET";
  await handle(
    post({ mode: "overview", artwork_id: "a" }),
    deps({
      complete: (_m, _t, model) => {
        usedModel = model;
        return Promise.resolve("ok");
      },
    }),
  );
  assertEquals(usedModel, undefined);
});

Deno.test("body.model overrides the model passed to streamDeltas() on ask", async () => {
  let usedModel: string | undefined = "UNSET";
  const res = await handle(
    post({ mode: "ask", artwork_id: "a", question: "x", model: "gemma-test" }),
    deps({
      streamDeltas: async function* (_m, _t, model) {
        usedModel = model;
        yield "ok";
      },
    }),
  );
  await res.text(); // drain the stream so the generator runs
  assertEquals(usedModel, "gemma-test");
});

Deno.test("ask threads history_summary as an earlier-context system message", async () => {
  // Verify the summary actually reaches the LLM messages list.
  let capturedMessages: unknown[] = [];
  const res = await handle(
    post({
      mode: "ask",
      artwork_id: "a",
      question: "x",
      history_summary: "visitor liked the light",
    }),
    deps({
      streamDeltas: async function* (messages) {
        capturedMessages = messages;
        yield "ok";
      },
    }),
  );
  await res.text(); // drain
  const systemMessages = (capturedMessages as Array<{ role: string; content: string }>)
    .filter((m) => m.role === "system");
  assert(
    systemMessages.some((m) => m.content.includes("visitor liked the light")),
    "history_summary not injected into messages",
  );
});
