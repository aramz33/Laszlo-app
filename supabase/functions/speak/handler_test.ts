// deno test supabase/functions/speak/handler_test.ts
// Behavior of /speak through Request -> Response, with the engine-selection logic
// front and center. Engines + Storage upload are injected, so it's offline.

import { assert, assertEquals } from "jsr:@std/assert@1";
import { type EngineMap, handle, type SpeakDeps } from "./index.ts";

const audio = () => Promise.resolve(new Uint8Array([1, 2, 3]));
const boom = () => Promise.reject(new Error("engine down"));

/** All engines succeed unless overridden. */
function engines(over: Partial<EngineMap> = {}): EngineMap {
  return { elevenlabs: audio, edge: audio, mistral: audio, google: audio, ...over };
}

function deps(eng: EngineMap = engines()): SpeakDeps {
  return {
    engines: eng,
    uploadAudio: () => Promise.resolve("http://audio/x.mp3"),
  };
}

const post = (payload: unknown) =>
  new Request("http://t/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

Deno.test("non-POST is rejected -> 405", async () => {
  assertEquals(
    (await handle(new Request("http://t/speak", { method: "GET" }), deps())).status,
    405,
  );
});

Deno.test("invalid JSON -> 400", async () => {
  assertEquals(
    (await handle(
      new Request("http://t/speak", { method: "POST", body: "{not json" }),
      deps(),
    )).status,
    400,
  );
});

Deno.test("empty text -> 400", async () => {
  assertEquals((await handle(post({ lang: "fr" }), deps())).status, 400);
});

Deno.test("explicit provider is used and reported", async () => {
  const res = await handle(post({ text: "hi", provider: "mistral" }), deps());
  const body = await res.json();
  assertEquals(body.engine, "mistral");
  assertEquals(body.audio_url, "http://audio/x.mp3");
});

Deno.test("unknown provider uses the auto chain (edge first, elevenlabs opt-in)", async () => {
  const res = await handle(post({ text: "hi", provider: "wat" }), deps());
  assertEquals((await res.json()).engine, "edge");
});

Deno.test("chosen engine failure falls back down the chain", async () => {
  const res = await handle(
    post({ text: "hi", provider: "edge" }),
    deps(engines({ edge: boom })),
  );
  assertEquals((await res.json()).engine, "google"); // edge failed -> google
});

Deno.test("mistral failure falls back to edge", async () => {
  const res = await handle(
    post({ text: "hi", provider: "mistral" }),
    deps(engines({ mistral: boom })),
  );
  assertEquals((await res.json()).engine, "edge");
});

Deno.test("all engines down -> 502", async () => {
  const res = await handle(
    post({ text: "hi", provider: "edge" }),
    deps(engines({ edge: boom, google: boom, mistral: boom })),
  );
  assertEquals(res.status, 502);
});

Deno.test("default (auto) uses edge (elevenlabs is opt-in to save credits)", async () => {
  const res = await handle(post({ text: "hi" }), deps());
  assertEquals((await res.json()).engine, "edge");
});

Deno.test("elevenlabs engine is used when explicitly requested", async () => {
  const res = await handle(
    post({ text: "hi", provider: "elevenlabs" }),
    deps(),
  );
  assertEquals((await res.json()).engine, "elevenlabs");
});

Deno.test("explicit elevenlabs failure falls back to edge (not google)", async () => {
  // When elevenlabs is requested explicitly and fails, edge is the next reliable fallback.
  const res = await handle(
    post({ text: "hi", provider: "elevenlabs" }),
    deps(engines({ elevenlabs: boom })),
  );
  assertEquals((await res.json()).engine, "edge");
});

Deno.test("upload failure -> 502", async () => {
  const res = await handle(
    post({ text: "hi" }),
    {
      engines: engines(),
      uploadAudio: () => Promise.reject(new Error("storage down")),
    },
  );
  assertEquals(res.status, 502);
});

Deno.test("successful response has correct shape (audio_url, format, duration_s, engine)", async () => {
  const res = await handle(post({ text: "hi", provider: "edge" }), deps());
  const body = await res.json();
  assertEquals(body.audio_url, "http://audio/x.mp3");
  assertEquals(body.format, "mp3");
  assertEquals(body.duration_s, null); // MP3 not decoded; ponytail
  assertEquals(body.engine, "edge");
});
