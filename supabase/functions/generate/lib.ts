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
