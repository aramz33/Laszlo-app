// deno test supabase/functions/speak/stub_test.ts
// Pure chunking/URL helpers — the TTS + upload path is covered by curl/Bruno checks.

import { assert, assertEquals } from "jsr:@std/assert@1";
import { chunkText, googleTtsUrl } from "./lib.ts";

Deno.test("chunkText keeps chunks under the limit and on word boundaries", () => {
  const text = "one two three four five six seven eight nine ten";
  const chunks = chunkText(text, 12);
  for (const c of chunks) assert(c.length <= 12, `too long: "${c}"`);
  assertEquals(chunks.join(" "), text); // no words lost or split
});

Deno.test("chunkText returns a single chunk for short text", () => {
  assertEquals(chunkText("hello world", 180), ["hello world"]);
});

Deno.test("googleTtsUrl encodes the query and sets the language", () => {
  const url = googleTtsUrl("Bonjour Laszlo", "fr");
  assert(url.includes("tl=fr"));
  assert(url.includes("q=Bonjour%20Laszlo"));
});
