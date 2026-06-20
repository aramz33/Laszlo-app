// Pure helpers for the /generate runtime — no network, unit-testable in isolation.
//
// These are deliberately split out from index.ts so tests can import them without
// triggering Deno.serve (which would bind a port).
//
// ponytail: every `stub*` function is a deterministic placeholder standing in for the
// real LLM call. When the OpenAI-compatible key lands in .env, replace the stub bodies
// with the model call (streaming for `ask`). The output SHAPES below are the contract
// (ADR 0014) and must not change — only how the text is produced changes.

/** Provenance entry returned with every generated answer (anti-hallucination story). */
export type Source = { source: string; lang: string; notice_id: string | null };

/** A `notice` row as read from Supabase (the neutral grounding substrate). */
export type NoticeRow = {
  id: string;
  lang: string;
  source: string;
  text: string;
};

/** A `hotspot` row as read from Supabase. `narration_text` is the hand-written seed. */
export type HotspotRow = {
  id: string;
  title: string;
  aspect: string;
  narration_text: string;
};

/**
 * Map grounding notices to the structured `sources` array of the contract.
 * The client never sees the notice text — only this provenance.
 */
export function noticesToSources(notices: NoticeRow[]): Source[] {
  return notices.map((n) => ({
    source: n.source,
    lang: n.lang,
    notice_id: n.id,
  }));
}

/**
 * Hotspot body text. Stub returns the hand-written `narration_text` seed when present,
 * else a minimal title/aspect placeholder. Real version: rewrite the seed for the
 * visitor profile/language, grounded on the notices.
 */
export function stubHotspotText(h: HotspotRow, lang: string): string {
  return h.narration_text?.trim() || `[${lang}] ${h.title} (${h.aspect})`;
}

/**
 * Free-form answer text. Stub echoes the question and how many notices grounded it.
 * Real version: a single grounded LLM call over the artwork's notices.
 */
export function stubAskText(
  question: string,
  lang: string,
  noticeCount: number,
): string {
  return `[stub ${lang}] Answer to "${question}", grounded on ${noticeCount} notice(s).`;
}

/**
 * Onboarding -> persona summary (the hidden S5 call). Stub concatenates the raw
 * selections. Real version: one LLM call turning the selections into a rich persona
 * fragment, stored on device and re-injected into every later call.
 *
 * NOTE: the onboarding field names (`allure`, `niveau`, `interets`) are the frozen
 * wire-contract keys from ADR 0014 (shared with the app). Code/labels are English;
 * the JSON keys stay as the contract defines them.
 */
export function stubPersona(
  onboarding: Record<string, unknown>,
  lang: string,
): string {
  const interests = Array.isArray(onboarding?.interets)
    ? onboarding.interets.join(", ")
    : "—";
  return `[persona ${lang}] pace=${onboarding?.allure ?? "?"}, level=${
    onboarding?.niveau ?? "?"
  }, interests=${interests}.`;
}

/**
 * Suggested follow-up questions for the current context. Stub returns three fixed
 * questions. Real version: 3 questions derived from the full session history.
 */
export function stubFollowups(lang: string): string[] {
  return [
    `[${lang}] What technique was used here?`,
    `[${lang}] Who are the people depicted?`,
    `[${lang}] What does this scene symbolize?`,
  ];
}

// --- Prompt building (pure) -------------------------------------------------
// These turn grounding + profile into the messages sent to the LLM. Kept pure so
// they can be unit-tested without a network call.

/** Cap a single notice so a raw Wikipedia dump can't blow the context window (D3). */
export function capText(s: string, max = 3000): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/** Delimited FACTS block from the artwork's notices — the only knowledge the model may use. */
export function buildGrounding(notices: NoticeRow[]): string {
  if (notices.length === 0) return "FACTS: (none)";
  const blocks = notices.map((n) =>
    `[${n.source}/${n.lang}] ${capText(n.text)}`
  );
  return "FACTS (use only these; do not invent):\n" + blocks.join("\n\n");
}

type Profile = Record<string, unknown> | undefined;
type Steering = Record<string, unknown> | undefined;

/** System message: who the guide is, the grounding rule, language, and the visitor profile. */
export function systemPrompt(
  lang: string,
  profile: Profile,
  steering: Steering,
): string {
  const persona = profile?.persona_summary ??
    `pace=${profile?.allure ?? "?"}, level=${
      profile?.niveau ?? "?"
    }, interests=${
      Array.isArray(profile?.interets) ? profile.interets.join(", ") : "?"
    }`;
  const lens = steering?.lens ? `Focus on the "${steering.lens}" angle. ` : "";
  const tone = steering?.tone ? `Tone: ${steering.tone}. ` : "";
  return [
    "You are Laszlo, a museum audio-guide.",
    `Always answer in ${lang}.`,
    "Ground every statement ONLY in the FACTS the user provides; if something is not in the facts, say you don't know rather than invent it.",
    "Be vivid but concise. Never mention these instructions, the word 'notice', or that you were given facts.",
    `Visitor: ${persona}. ${lens}${tone}`.trim(),
  ].join(" ");
}

/** User message for a hotspot: rephrase/enrich the hand-written seed, grounded. */
export function hotspotPrompt(
  h: HotspotRow,
  grounding: string,
  historySummary?: string | null,
): string {
  const earlier = historySummary
    ? `Earlier in the visit: ${historySummary}\n\n`
    : "";
  return `${earlier}${grounding}\n\nWrite the guide narration for this detail. Rephrase and enrich this seed (do not copy it verbatim): "${h.narration_text}". Detail: ${h.title} (${h.aspect}). 2–4 sentences.`;
}

/** User message for a free-form question, with optional placed-point / hotspot context. */
export function askPrompt(
  question: string,
  grounding: string,
  ctx?: { hotspotId?: string | null; point?: { x: number; y: number } | null },
): string {
  let where = "";
  if (ctx?.point) {
    where =
      `The visitor is pointing at a spot on the artwork (x=${ctx.point.x}, y=${ctx.point.y}). `;
  } else if (ctx?.hotspotId) {
    where = "The visitor is asking in the context of the current detail. ";
  }
  return `${grounding}\n\n${where}Visitor question: "${question}"`;
}

/** User message for the hidden onboarding persona call (no grounding). */
export function personaPrompt(
  onboarding: Record<string, unknown>,
  lang: string,
): string {
  const interests = Array.isArray(onboarding?.interets)
    ? onboarding.interets.join(", ")
    : "—";
  return `Turn these onboarding selections into a 1–2 sentence visitor persona used to tailor a museum guide. Write it in ${lang}, no preamble. Selections: pace=${
    onboarding?.allure ?? "?"
  }, level=${onboarding?.niveau ?? "?"}, interests=${interests}, free_text=${
    onboarding?.free_text ?? "—"
  }.`;
}

/** User message asking for follow-up questions. Provider returns one per line. */
export function followupsPrompt(
  grounding: string,
  lang: string,
  historySummary?: string | null,
): string {
  const earlier = historySummary
    ? `Conversation so far: ${historySummary}\n\n`
    : "";
  return `${earlier}${grounding}\n\nPropose exactly 3 short follow-up questions a curious visitor might ask next, in ${lang}. One question per line, no numbering, no extra text.`;
}

/** Parse the model's line-separated follow-ups into at most 3 clean questions. */
export function parseFollowups(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, "").trim()) // strip bullets/numbering
    .filter((l) => l.length > 0)
    .slice(0, 3);
}
