// deno test supabase/functions/identify/handler_test.ts
// Behavior of /identify through Request -> Response; DB read + vision injected.

import { assertEquals } from "jsr:@std/assert@1";
import { handle, type IdentifyDeps } from "./index.ts";
import type { CandidateRow } from "./lib.ts";

const CANDIDATES: CandidateRow[] = [
  {
    id: "nw",
    object_number: "SK-C-5",
    title_en: "The Night Watch",
    title_nl: null,
    year: 1642,
    artist: { name: "Rembrandt" },
  },
  {
    id: "mk",
    object_number: "SK-A-2344",
    title_en: "The Milkmaid",
    title_nl: null,
    year: 1660,
    artist: { name: "Vermeer" },
  },
];

function deps(over: Partial<IdentifyDeps> = {}): IdentifyDeps {
  return {
    readCandidates: () => Promise.resolve(CANDIDATES),
    vision: () => Promise.resolve("nw"),
    ...over,
  };
}

function upload(image: File | null, candidateIds?: string): Request {
  const form = new FormData();
  if (image) form.append("image", image);
  if (candidateIds) form.append("candidate_ids", candidateIds);
  return new Request("http://t/identify", { method: "POST", body: form });
}

const jpg = () =>
  new File([new Uint8Array(64)], "p.jpg", { type: "image/jpeg" });

Deno.test("missing image -> 400", async () => {
  assertEquals((await handle(upload(null), deps())).status, 400);
});

Deno.test("no candidates -> null match (not an error)", async () => {
  const res = await handle(
    upload(jpg()),
    deps({ readCandidates: () => Promise.resolve([]) }),
  );
  assertEquals(res.status, 200);
  assertEquals(await res.json(), {
    artwork_id: null,
    confidence: 0,
    candidates: null,
  });
});

Deno.test("vision picks a candidate -> that artwork_id with confidence", async () => {
  const res = await handle(
    upload(jpg(), "nw,mk"),
    deps({ vision: () => Promise.resolve("nw") }),
  );
  const body = await res.json();
  assertEquals(body.artwork_id, "nw");
  assertEquals(body.confidence, 0.9);
});

Deno.test("vision says none -> null artwork_id", async () => {
  const res = await handle(
    upload(jpg()),
    deps({ vision: () => Promise.resolve("none") }),
  );
  assertEquals((await res.json()).artwork_id, null);
});

Deno.test("vision failure -> 502", async () => {
  const res = await handle(
    upload(jpg()),
    deps({ vision: () => Promise.reject(new Error("down")) }),
  );
  assertEquals(res.status, 502);
});
