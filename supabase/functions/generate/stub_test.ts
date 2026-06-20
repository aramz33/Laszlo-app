// deno test supabase/functions/generate/stub_test.ts
// Vérifie les helpers purs (formes de réponse conformes au contrat), sans réseau.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { noticesToSources, stubFollowups, stubHotspotText, stubPersona } from "./lib.ts";

Deno.test("noticesToSources → forme {source,lang,notice_id}", () => {
  const out = noticesToSources([{ id: "n1", lang: "en", source: "rijks", text: "x" }]);
  assertEquals(out, [{ source: "rijks", lang: "en", notice_id: "n1" }]);
});

Deno.test("stubHotspotText : narration_text si présent, sinon fallback titre/aspect", () => {
  assertEquals(stubHotspotText({ id: "h", title: "T", aspect: "A", narration_text: "  vrai  " }, "fr"), "vrai");
  assert(stubHotspotText({ id: "h", title: "T", aspect: "A", narration_text: "" }, "fr").includes("T"));
});

Deno.test("stubFollowups : exactement 3 questions", () => {
  assertEquals(stubFollowups("fr").length, 3);
});

Deno.test("stubPersona : reflète les intérêts", () => {
  assert(stubPersona({ allure: "court", niveau: "amateur", interets: ["technique"] }, "fr").includes("technique"));
});
