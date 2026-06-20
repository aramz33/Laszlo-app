// deno test supabase/functions/transcribe/handler_test.ts
// Behavior of /transcribe through Request -> Response, STT injected.

import { assert, assertEquals } from "jsr:@std/assert@1";
import { handle, type TranscribeDeps } from "./index.ts";

const okStt: TranscribeDeps = {
  stt: (_a, lang) => Promise.resolve({ text: "hello", lang, duration_s: 2 }),
};

function upload(file: File | null, langHint?: string): Request {
  const form = new FormData();
  if (file) form.append("audio", file);
  if (langHint) form.append("lang_hint", langHint);
  return new Request("http://t/transcribe", { method: "POST", body: form });
}

const wav = (bytes = 100) =>
  new File([new Uint8Array(bytes)], "a.wav", { type: "audio/wav" });

Deno.test("non-POST is rejected", async () => {
  const res = await handle(
    new Request("http://t/transcribe", { method: "GET" }),
    okStt,
  );
  assertEquals(res.status, 405);
});

Deno.test("missing audio file -> 400", async () => {
  assertEquals((await handle(upload(null), okStt)).status, 400);
});

Deno.test("oversized audio -> 413", async () => {
  const big = new File([new Uint8Array(11 * 1024 * 1024)], "big.wav", {
    type: "audio/wav",
  });
  assertEquals((await handle(upload(big), okStt)).status, 413);
});

Deno.test("valid upload returns the transcript and echoes lang_hint", async () => {
  const res = await handle(upload(wav(), "fr"), okStt);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { text: "hello", lang: "fr", duration_s: 2 });
});

Deno.test("STT failure -> 502", async () => {
  const res = await handle(upload(wav()), {
    stt: () => Promise.reject(new Error("down")),
  });
  assertEquals(res.status, 502);
});

Deno.test("no lang_hint -> lang is null in transcript", async () => {
  // When the caller omits lang_hint, the contract returns lang: null
  // (STT does not detect language; we echo the hint or null).
  const res = await handle(upload(wav() /* no langHint */), okStt);
  assertEquals(res.status, 200);
  assertEquals((await res.json()).lang, null);
});
