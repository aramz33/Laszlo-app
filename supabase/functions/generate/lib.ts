// Pure helpers for the /generate runtime — no network, unit-testable in isolation.
//
// These are deliberately split out from index.ts so tests can import them without
// triggering Deno.serve (which would bind a port).
//
// ponytail: every `stub*` function is the deterministic fallback used when the real LLM
// call (llm.ts, wired in index.ts) fails — so a demo never shows a blank. The output
// SHAPES below are the contract (ADR 0014) and must not change.

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

/** Hotspot fallback. Keep the French seed only for French; other languages get
 * a small localized sentence so TTS never reads French with a foreign voice. */
export function stubHotspotText(h: HotspotRow, lang: string): string {
  const seed = h.narration_text?.trim();
  if (lang === "fr" && seed) return seed;

  const detail = h.title?.trim() || h.aspect?.trim() || "this detail";
  const FALLBACK: Record<string, string> = {
    en: `Look closely at ${detail}. The full narration is not available right now.`,
    nl:
      `Kijk goed naar ${detail}. De volledige toelichting is nu niet beschikbaar.`,
    fr: `Regardez bien ${detail}. La narration complète n'est pas disponible pour l'instant.`,
  };
  return FALLBACK[lang] ?? FALLBACK.en;
}

/**
 * Onboarding -> persona summary (the hidden S5 call). Stub concatenates the raw
 * selections; the real call turns them into a rich persona fragment, stored on device
 * and re-injected into every later call.
 *
 * NOTE: the onboarding keys (`motivation`, `knowledge`, `depth`) are the profile-axis
 * wire keys shared with the app (see data-model.md / ADR 0008). Code/labels are English.
 */
export function stubPersona(
  _onboarding: Record<string, unknown>,
  lang: string,
): string {
  const FALLBACK: Record<string, string> = {
    fr: "Ravi de vous accompagner devant ces œuvres.",
    en: "Glad to walk you through these works.",
    nl: "Fijn om u langs deze werken te begeleiden.",
  };
  return FALLBACK[lang] ?? FALLBACK.en;
}

/**
 * Overview intro text. Stub returns a placeholder. Real version: a single grounded
 * LLM call introducing the whole artwork (who, when, why it matters).
 */
export function stubOverviewText(lang: string): string {
  return `[overview ${lang}] An introduction to this artwork.`;
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

// --- Grounding (pure) -------------------------------------------------------
// Selecting + shaping the FACTS block. Pure so it's unit-testable without a network call.
// (Prompt text lives in prompts.ts.)

// Grounding budget: ~8k tokens ≈ 32k chars. The cap is about COST (grounding is re-sent
// on every call) and PRECISION (lost-in-the-middle), NOT model capacity. Below it we send
// the clean full article; above it we trim at section boundaries. (Grill 2026-06-21.)
export const GROUNDING_BUDGET_CHARS = 32000;

// Wikipedia tail sections that are pure noise for a visitor chat (en + nl headings).
const NOISE_HEADING =
  /^(references|external links|see also|further reading|notes|bibliography|sources|citations|footnotes|zie ook|externe links|bronnen|noten|literatuur|voetnoten|verwijzingen)$/i;

type Section = { heading: string; body: string };

/** Split a MediaWiki plaintext extract into [lead, ...sections] on `== Heading ==` lines. */
export function splitSections(text: string): Section[] {
  const parts = text.split(/^={2,}\s*(.+?)\s*=+\s*$/m);
  const out: Section[] = [{ heading: "", body: parts[0] ?? "" }];
  for (let i = 1; i < parts.length; i += 2) {
    out.push({ heading: parts[i].trim(), body: parts[i + 1] ?? "" });
  }
  return out;
}

/** Drop boilerplate sections (references, external links, …). The lead is always kept. */
export function stripNoiseSections(text: string): string {
  return splitSections(text)
    .filter((s) => s.heading === "" || !NOISE_HEADING.test(s.heading))
    .map((s) =>
      s.heading ? `\n\n${s.heading}\n${s.body.trim()}` : s.body.trim(),
    )
    .join("")
    .trim();
}

/** Section-aware fit: keep the lead, then whole sections in order until the budget is hit.
 *  Never cuts mid-section (so never mid-sentence). Returns the text unchanged if it fits. */
export function fitToBudget(
  text: string,
  maxChars = GROUNDING_BUDGET_CHARS,
): string {
  if (text.length <= maxChars) return text;
  const secs = splitSections(text);
  let out = secs[0].body.trim(); // lead always included
  for (const s of secs.slice(1)) {
    const block = `\n\n${s.heading}\n${s.body.trim()}`;
    if (out.length + block.length > maxChars) break;
    out += block;
  }
  return out.trim() + "\n…";
}

/** EN-pivot grounding selection: ground on a SINGLE language to avoid redundant bilingual
 *  facts (dilution + cost). Prefer the language whose Wikipedia notice exists, en first;
 *  keep every notice (rijks + wikipedia) in that language. (Grill 2026-06-21.) */
export function selectPivotNotices(notices: NoticeRow[]): NoticeRow[] {
  if (notices.length === 0) return notices;
  const hasWiki = (lang: string) =>
    notices.some((n) => n.source === "wikipedia" && n.lang === lang);
  const pivot = hasWiki("en")
    ? "en"
    : hasWiki("nl")
      ? "nl"
      : (notices.find((n) => n.lang === "en")?.lang ?? notices[0].lang);
  return notices.filter((n) => n.lang === pivot);
}

/** Delimited FACTS block from the artwork's notices — the only knowledge the model may use.
 *  Expects already pivot-selected notices (see selectPivotNotices). Strips noise sections,
 *  then fits within the shared budget (rijks first — tiny & authoritative — then wikipedia). */
export function buildGrounding(notices: NoticeRow[]): string {
  if (notices.length === 0) return "FACTS: (none)";
  const ordered = [...notices].sort(
    (a, b) =>
      (a.source === "wikipedia" ? 1 : 0) - (b.source === "wikipedia" ? 1 : 0),
  );
  let remaining = GROUNDING_BUDGET_CHARS;
  const blocks: string[] = [];
  for (const n of ordered) {
    if (remaining <= 0) break;
    const fitted = fitToBudget(stripNoiseSections(n.text), remaining);
    blocks.push(`[${n.source}/${n.lang}] ${fitted}`);
    remaining -= fitted.length;
  }
  return "FACTS (use only these; do not invent):\n" + blocks.join("\n\n");
}

/** Parse the model's line-separated follow-ups into at most 3 clean questions. */
export function parseFollowups(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, "").trim()) // strip bullets/numbering
    .filter((l) => l.length > 0)
    .slice(0, 3);
}
