// deno test supabase/functions/identify/stub_test.ts
// Pure helpers only — the vision call is covered by curl/Bruno checks.

import { assert, assertEquals } from "jsr:@std/assert@1";
import { candidateLines, type CandidateRow, resolveMatch } from "./lib.ts";

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
