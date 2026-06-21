// deno test supabase/functions/generate/stub_test.ts
//
// Exercises the pure helpers (response shapes match the ADR 0014 contract), no network.
// We test lib.ts (not index.ts) so importing does not start the HTTP server.

import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  buildGrounding,
  fitToBudget,
  noticesToSources,
  parseFollowups,
  selectPivotNotices,
  stripNoiseSections,
  stubFollowups,
  stubHotspotText,
  stubOverviewText,
  stubPersona,
} from "./lib.ts";
import {
  askPrompt,
  followupsPrompt,
  hotspotPrompt,
  overviewPrompt,
  render,
  systemPrompt,
} from "./prompts.ts";

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

Deno.test("buildGrounding labels notices by source/lang and passes short text in full", () => {
  const g = buildGrounding([{
    id: "n",
    lang: "en",
    source: "rijks",
    text: "x".repeat(5000),
  }]);
  assert(g.includes("[rijks/en]"));
  assert(!g.includes("…")); // 5k chars is under the 32k budget — no truncation
});

Deno.test("buildGrounding trims an over-budget notice at a section boundary", () => {
  const huge = "lead.\n" +
    Array.from({ length: 50 }, (_, i) => `== Section ${i} ==\n${"y".repeat(1000)}`)
      .join("\n");
  const g = buildGrounding([{ id: "n", lang: "en", source: "wikipedia", text: huge }]);
  assert(g.length < huge.length, "over-budget notice should be trimmed");
  assert(g.includes("…"), "trim marker missing");
});

Deno.test("stubOverviewText contains the lang tag", () => {
  assert(stubOverviewText("fr").includes("overview"));
  assert(stubOverviewText("fr").includes("fr"));
});

Deno.test("overviewPrompt embeds the grounding and the intro instruction", () => {
  const p = overviewPrompt("FACTS: x");
  assert(p.includes("FACTS: x"));
  assert(p.includes("strikes the eye"));
});

Deno.test("overviewPrompt prepends history_summary when present", () => {
  const p = overviewPrompt("FACTS: x", "earlier stuff");
  assert(p.startsWith("Earlier"));
});

Deno.test("stubPersona reflects the onboarding axes (motivation/knowledge/depth)", () => {
  const out = stubPersona(
    { motivation: "stories", knowledge: "newcomer", depth: "quick" },
    "fr",
  );
  assert(out.includes("stories"));
  assert(out.includes("newcomer"));
});

// --- grounding shaping (strip / fit / pivot) --------------------------------

Deno.test("stripNoiseSections drops boilerplate sections but keeps the lead and content", () => {
  const text =
    "Lead paragraph.\n== History ==\nReal content.\n== References ==\n[1] junk\n== External links ==\nhttp://x";
  const out = stripNoiseSections(text);
  assert(out.includes("Lead paragraph."), "lead dropped");
  assert(out.includes("Real content."), "content section dropped");
  assert(!out.includes("junk"), "references not stripped");
  assert(!out.toLowerCase().includes("external links"), "external links not stripped");
});

Deno.test("stripNoiseSections strips Dutch boilerplate headings too", () => {
  const out = stripNoiseSections("Lead.\n== Zie ook ==\nx\n== Externe links ==\ny");
  assertEquals(out, "Lead.");
});

Deno.test("fitToBudget returns short text unchanged", () => {
  assertEquals(fitToBudget("short", 32000), "short");
});

Deno.test("fitToBudget keeps whole sections only (never mid-section) and marks the trim", () => {
  const text = "lead\n" +
    Array.from({ length: 10 }, (_, i) => `== S${i} ==\n${"z".repeat(100)}`).join("\n");
  const out = fitToBudget(text, 250);
  assert(out.length <= text.length);
  assert(out.endsWith("…"), "trim marker missing");
  // No partial section body: every 'z' run that appears is the full 100 chars.
  for (const run of out.match(/z+/g) ?? []) assertEquals(run.length, 100);
});

Deno.test("selectPivotNotices prefers EN when an EN wikipedia notice exists", () => {
  const notices = [
    { id: "1", lang: "en", source: "rijks", text: "a" },
    { id: "2", lang: "nl", source: "rijks", text: "b" },
    { id: "3", lang: "en", source: "wikipedia", text: "c" },
    { id: "4", lang: "nl", source: "wikipedia", text: "d" },
  ];
  const out = selectPivotNotices(notices);
  assertEquals(out.map((n) => n.id), ["1", "3"]); // only EN, both sources
});

Deno.test("selectPivotNotices falls back to NL when no EN wikipedia exists", () => {
  const notices = [
    { id: "1", lang: "en", source: "rijks", text: "a" },
    { id: "2", lang: "nl", source: "wikipedia", text: "d" },
  ];
  const out = selectPivotNotices(notices);
  assertEquals(out.map((n) => n.id), ["2"]); // pivot to the language that has the article
});

// --- systemPrompt -----------------------------------------------------------

Deno.test("render fills {{placeholders}} and leaves missing keys empty", () => {
  assertEquals(render("a {{x}} b {{y}}", { x: "1" }), "a 1 b ");
});

Deno.test("systemPrompt instructs the model to answer in the requested language", () => {
  const s = systemPrompt("nl", undefined, undefined);
  assert(s.includes("nl"), "language instruction missing");
});

Deno.test("systemPrompt maps depth=quick to the short length hint", () => {
  const s = systemPrompt("fr", { depth: "quick" }, undefined);
  assert(s.toLowerCase().includes("one or two sentences"), "expected short-length hint");
});

Deno.test("systemPrompt maps depth=deep to the rich length hint", () => {
  const s = systemPrompt("fr", { depth: "deep" }, undefined);
  assert(s.toLowerCase().includes("rich paragraph"), "expected long-length hint");
});

Deno.test("systemPrompt maps knowledge=newcomer to plain-words register", () => {
  const s = systemPrompt("fr", { knowledge: "newcomer" }, undefined);
  assert(s.toLowerCase().includes("plain"), "expected plain-words register");
});

Deno.test("systemPrompt maps knowledge=expert to precise vocabulary register", () => {
  const s = systemPrompt("fr", { knowledge: "expert" }, undefined);
  assert(s.toLowerCase().includes("precise"), "expected precise register");
});

Deno.test("systemPrompt maps motivation=stories to the story/people angle", () => {
  const s = systemPrompt("fr", { motivation: "stories" }, undefined);
  assert(s.toLowerCase().includes("stories"), "expected story/people angle");
});

Deno.test("systemPrompt defaults are applied when no profile is given", () => {
  const s = systemPrompt("fr", undefined, undefined);
  assert(s.toLowerCase().includes("three or four sentences"), "expected standard depth default");
  assert(s.toLowerCase().includes("understand"), "expected understand motivation default");
});

Deno.test("systemPrompt injects steering.tone when provided", () => {
  const s = systemPrompt("fr", undefined, { tone: "warm" });
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
