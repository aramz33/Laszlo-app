// deno test supabase/functions/generate/stub_test.ts
//
// Exercises the pure helpers (response shapes match the ADR 0014 contract), no network.
// We test lib.ts (not index.ts) so importing does not start the HTTP server.

import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  askPrompt,
  buildGrounding,
  capText,
  followupsPrompt,
  hotspotPrompt,
  noticesToSources,
  overviewPrompt,
  parseFollowups,
  stubFollowups,
  stubHotspotText,
  stubOverviewText,
  stubPersona,
  systemPrompt,
} from "./lib.ts";

Deno.test("noticesToSources maps rows to {source, lang, notice_id}", () => {
  const out = noticesToSources([{
    id: "n1",
    lang: "en",
    source: "rijks",
    text: "x",
  }]);
  assertEquals(out, [{ source: "rijks", lang: "en", notice_id: "n1" }]);
});

Deno.test("stubHotspotText prefers narration_text, falls back to title/aspect", () => {
  // Hand-written seed present -> trimmed seed is returned.
  assertEquals(
    stubHotspotText({
      id: "h",
      title: "T",
      aspect: "A",
      narration_text: "  real  ",
    }, "fr"),
    "real",
  );
  // Empty seed -> placeholder mentions the title.
  assert(
    stubHotspotText(
      { id: "h", title: "T", aspect: "A", narration_text: "" },
      "fr",
    ).includes("T"),
  );
});

Deno.test("stubFollowups returns exactly three questions", () => {
  assertEquals(stubFollowups("fr").length, 3);
});

Deno.test("parseFollowups strips numbering/bullets and caps at 3", () => {
  const raw = "1. First?\n- Second?\n* Third?\nFourth?";
  assertEquals(parseFollowups(raw), ["First?", "Second?", "Third?"]);
  assertEquals(parseFollowups("\n\n"), []);
});

Deno.test("buildGrounding labels notices by source/lang and caps length", () => {
  const g = buildGrounding([{
    id: "n",
    lang: "en",
    source: "rijks",
    text: "x".repeat(5000),
  }]);
  assert(g.includes("[rijks/en]"));
  assert(g.includes("…")); // long notice was truncated
});

Deno.test("stubOverviewText contains the lang tag", () => {
  assert(stubOverviewText("fr").includes("overview"));
  assert(stubOverviewText("fr").includes("fr"));
});

Deno.test("overviewPrompt embeds the grounding and the intro instruction", () => {
  const p = overviewPrompt("FACTS: x");
  assert(p.includes("FACTS: x"));
  assert(p.includes("Introduce"));
});

Deno.test("overviewPrompt prepends history_summary when present", () => {
  const p = overviewPrompt("FACTS: x", "earlier stuff");
  assert(p.startsWith("Earlier"));
});

Deno.test("stubPersona reflects the onboarding selections", () => {
  // Reads the frozen contract keys (allure/niveau/interets) but labels them in English.
  assert(
    stubPersona(
      { allure: "court", niveau: "amateur", interets: ["technique"] },
      "fr",
    ).includes("technique"),
  );
});

// --- capText ----------------------------------------------------------------

Deno.test("capText truncates long text and appends an ellipsis", () => {
  const long = "a".repeat(4000);
  const out = capText(long);
  assert(out.length < long.length);
  assert(out.endsWith("…"));
});

Deno.test("capText leaves short text unchanged", () => {
  assertEquals(capText("short"), "short");
});

// --- systemPrompt -----------------------------------------------------------

Deno.test("systemPrompt instructs the model to answer in the requested language", () => {
  const s = systemPrompt("nl", undefined, undefined);
  assert(s.includes("nl"), "language instruction missing");
});

Deno.test("systemPrompt maps allure=court to the short length hint", () => {
  const s = systemPrompt("fr", { allure: "court" }, undefined);
  assert(s.includes("1–2"), "expected short-length hint");
});

Deno.test("systemPrompt maps allure=long to the rich length hint", () => {
  const s = systemPrompt("fr", { allure: "long" }, undefined);
  assert(s.includes("4–6"), "expected long-length hint");
});

Deno.test("systemPrompt maps niveau=decouverte to plain-words register", () => {
  const s = systemPrompt("fr", { niveau: "decouverte" }, undefined);
  assert(s.toLowerCase().includes("plain"), "expected plain-words register");
});

Deno.test("systemPrompt maps niveau=passionne to precise vocabulary register", () => {
  const s = systemPrompt("fr", { niveau: "passionne" }, undefined);
  assert(s.toLowerCase().includes("precise"), "expected precise register");
});

Deno.test("systemPrompt injects steering.lens when provided", () => {
  const s = systemPrompt("fr", undefined, { lens: "symbols", tone: null });
  assert(s.includes("symbols"), "expected lens in prompt");
});

Deno.test("systemPrompt injects steering.tone when provided", () => {
  const s = systemPrompt("fr", undefined, { lens: null, tone: "warm" });
  assert(s.includes("warm"), "expected tone in prompt");
});

Deno.test("systemPrompt injects persona_summary when present in profile", () => {
  const s = systemPrompt("fr", { persona_summary: "curious beginner" }, undefined);
  assert(s.includes("curious beginner"), "expected persona_summary");
});

// --- hotspotPrompt ----------------------------------------------------------

Deno.test("hotspotPrompt embeds the grounding and the seed", () => {
  const h = { id: "h", title: "Le geste", aspect: "technique", narration_text: "seed text" };
  const p = hotspotPrompt(h, "FACTS: x");
  assert(p.includes("FACTS: x"), "grounding missing");
  assert(p.includes("seed text"), "seed missing");
  assert(p.includes("Le geste"), "title missing");
});

Deno.test("hotspotPrompt prepends history_summary when present", () => {
  const h = { id: "h", title: "T", aspect: "A", narration_text: "s" };
  const p = hotspotPrompt(h, "FACTS: x", "earlier visit context");
  assert(p.startsWith("Earlier"), "history_summary not prepended");
});

// --- askPrompt --------------------------------------------------------------

Deno.test("askPrompt embeds the grounding and the question", () => {
  const p = askPrompt("What technique?", "FACTS: y");
  assert(p.includes("FACTS: y"));
  assert(p.includes("What technique?"));
});

Deno.test("askPrompt adds point context when a coordinate is provided", () => {
  const p = askPrompt("What is that?", "FACTS: y", { point: { x: 0.5, y: 0.3 } });
  assert(p.includes("0.5") && p.includes("0.3"), "point coordinates missing");
});

Deno.test("askPrompt adds hotspot context when hotspot_id is provided", () => {
  const p = askPrompt("Tell me more", "FACTS: y", { hotspotId: "h1" });
  assert(p.toLowerCase().includes("context"), "hotspot context hint missing");
});

// --- followupsPrompt --------------------------------------------------------

Deno.test("followupsPrompt embeds the grounding and the target language", () => {
  const p = followupsPrompt("FACTS: z", "en");
  assert(p.includes("FACTS: z"));
  assert(p.includes("en"));
  assert(p.includes("3"), "should ask for exactly 3 questions");
});

Deno.test("followupsPrompt prepends history_summary when present", () => {
  const p = followupsPrompt("FACTS: z", "fr", "earlier summary");
  assert(p.includes("earlier summary"));
});
