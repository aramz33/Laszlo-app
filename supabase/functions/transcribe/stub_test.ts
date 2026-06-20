// deno test supabase/functions/transcribe/stub_test.ts
// Pure mapping helper only — the network path is covered by the curl/Bruno checks.

import { assertEquals } from "jsr:@std/assert@1";
import { toTranscript } from "./lib.ts";

Deno.test("toTranscript maps provider response and trims text", () => {
  assertEquals(
    toTranscript({ text: "  hello  ", usage: { seconds: 3 } }, "en"),
    { text: "hello", lang: "en", duration_s: 3 },
  );
});

Deno.test("toTranscript tolerates missing fields", () => {
  assertEquals(
    toTranscript({}, null),
    { text: "", lang: null, duration_s: null },
  );
});
