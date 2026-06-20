// deno test supabase/functions/identify/stub_test.ts
// Pure helpers only — the vision call is covered by curl/Bruno checks.

import { assert, assertEquals } from "jsr:@std/assert@1";
import { candidateLines, type CandidateRow, resolveMatch, visionPrompt } from "./lib.ts";

const rows: CandidateRow[] = [
  {
    id: "aaa",
    object_number: "SK-C-5",
    title_en: "The Night Watch",
    title_nl: null,
    year: 1642,
    artist: { name: "Rembrandt" },
  },
  {
    id: "bbb",
    object_number: "SK-A-2344",
    title_en: "The Milkmaid",
    title_nl: null,
    year: 1660,
    artist: { name: "Vermeer" },
  },
];

Deno.test("candidateLines includes id, title and artist", () => {
  const out = candidateLines(rows);
  assert(out.includes("aaa:"));
  assert(out.includes("The Night Watch"));
  assert(out.includes("Rembrandt"));
});

Deno.test("resolveMatch finds the id the model returned", () => {
  assertEquals(resolveMatch("aaa", ["aaa", "bbb"]), {
    artwork_id: "aaa",
    confidence: 0.9,
    candidates: null,
  });
  // tolerates extra text around the id
  assertEquals(
    resolveMatch("The answer is bbb.", ["aaa", "bbb"]).artwork_id,
    "bbb",
  );
});

Deno.test("resolveMatch returns none when the model declines", () => {
  assertEquals(resolveMatch("none", ["aaa", "bbb"]), {
    artwork_id: null,
    confidence: 0,
    candidates: null,
  });
});

Deno.test("candidateLines falls back to title_nl when title_en is null", () => {
  const row: CandidateRow = {
    id: "x",
    object_number: "SK-X-1",
    title_en: null,
    title_nl: "De Nachtwacht",
    year: null,
    artist: null,
  };
  const out = candidateLines([row]);
  assert(out.includes("De Nachtwacht"), "should use title_nl as fallback");
});

Deno.test("candidateLines falls back to object_number when both titles are null", () => {
  const row: CandidateRow = {
    id: "x",
    object_number: "SK-X-1",
    title_en: null,
    title_nl: null,
    year: null,
    artist: null,
  };
  const out = candidateLines([row]);
  assert(out.includes("SK-X-1"), "should use object_number as last fallback");
  assert(out.includes("unknown"), "null artist should appear as 'unknown'");
});

Deno.test("candidateLines omits year when it is null", () => {
  const row: CandidateRow = {
    id: "x",
    object_number: "SK-X-1",
    title_en: "T",
    title_nl: null,
    year: null,
    artist: { name: "A" },
  };
  const out = candidateLines([row]);
  // no stray parentheses from a missing year
  assert(!out.includes("(null)") && !out.includes("()"), "null year should be omitted");
});

Deno.test("visionPrompt tells the model to reply with an id or 'none'", () => {
  const p = visionPrompt(rows);
  assert(p.includes("aaa"), "candidate id missing from prompt");
  assert(p.includes("none"), "none option missing from prompt");
  assert(p.toLowerCase().includes("museum") || p.toLowerCase().includes("artwork"), "context missing");
});
