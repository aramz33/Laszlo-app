// deno test supabase/functions/generate/stub_test.ts
//
// Exercises the pure helpers (response shapes match the ADR 0014 contract), no network.
// We test lib.ts (not index.ts) so importing does not start the HTTP server.

import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  buildGrounding,
  noticesToSources,
  overviewPrompt,
  parseFollowups,
  stubFollowups,
  stubHotspotText,
  stubOverviewText,
  stubPersona,
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
