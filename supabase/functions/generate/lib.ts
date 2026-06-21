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

/**
 * Hotspot body text. Stub returns the hand-written `narration_text` seed when present,
 * else a minimal title/aspect placeholder. Real version: rewrite the seed for the
 * visitor profile/language, grounded on the notices.
 */
export function stubHotspotText(h: HotspotRow, lang: string): string {
  return h.narration_text?.trim() || `[${lang}] ${h.title} (${h.aspect})`;
}

/**
 * Onboarding -> persona summary (the hidden S5 call). Stub concatenates the raw
 * selections; the real call turns them into a rich persona fragment, stored on device
 * and re-injected into every later call.
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

// --- Prompt building (pure) -------------------------------------------------
// These turn grounding + profile into the messages sent to the LLM. Kept pure so
// they can be unit-tested without a network call.

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
    .map((s) => (s.heading ? `\n\n${s.heading}\n${s.body.trim()}` : s.body.trim()))
    .join("")
    .trim();
}

/** Section-aware fit: keep the lead, then whole sections in order until the budget is hit.
 *  Never cuts mid-section (so never mid-sentence). Returns the text unchanged if it fits. */
export function fitToBudget(text: string, maxChars = GROUNDING_BUDGET_CHARS): string {
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
    : notices.find((n) => n.lang === "en")?.lang ?? notices[0].lang;
  return notices.filter((n) => n.lang === pivot);
}

/** Delimited FACTS block from the artwork's notices — the only knowledge the model may use.
 *  Expects already pivot-selected notices (see selectPivotNotices). Strips noise sections,
 *  then fits within the shared budget (rijks first — tiny & authoritative — then wikipedia). */
export function buildGrounding(notices: NoticeRow[]): string {
  if (notices.length === 0) return "FACTS: (none)";
  const ordered = [...notices].sort((a, b) =>
    (a.source === "wikipedia" ? 1 : 0) - (b.source === "wikipedia" ? 1 : 0)
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

type Profile = Record<string, unknown> | undefined;
type Steering = Record<string, unknown> | undefined;

// Length is driven by `allure`, register by `niveau` — stated explicitly so the model
// actually varies output (a vague "be concise" did not move the needle).
const LENGTH: Record<string, string> = {
  court: "Answer in 1–2 short sentences.",
  moyen: "Answer in about 3 sentences.",
  long: "Answer in 4–6 sentences with rich detail.",
};
const REGISTER: Record<string, string> = {
  decouverte:
    "Use plain everyday words; avoid art jargon, or explain any term in a few words.",
  amateur: "Balanced register; use common art terms naturally.",
  passionne: "Use precise art-historical vocabulary and finer detail.",
};

/** System message: who the guide is, the grounding rule, language, and the visitor profile. */
export function systemPrompt(
  lang: string,
  profile: Profile,
  steering: Steering,
): string {
  const length = LENGTH[String(profile?.allure)] ?? LENGTH.moyen;
  const register = REGISTER[String(profile?.niveau)] ?? REGISTER.amateur;
  const interests = Array.isArray(profile?.interets) && profile.interets.length
    ? `The visitor is especially interested in: ${
      profile.interets.join(", ")
    }. `
    : "";
  const persona = profile?.persona_summary
    ? `Visitor profile: ${profile.persona_summary}. `
    : "";
  const lens = steering?.lens ? `Favor the "${steering.lens}" angle. ` : "";
  const tone = steering?.tone ? `Tone: ${steering.tone}. ` : "";
  return [
    "You are Laszlo, a museum audio-guide.",
    `Always answer in ${lang}.`,
    // Grounding guard — strict, because a generic "say you don't know" let the model
    // answer figures/dates from its own memory (hallucination risk for a grounded guide).
    "Use ONLY the FACTS provided by the user. Do NOT use outside knowledge. If a specific" +
    " detail (a number, date, name, price) is not in the FACTS, say you don't have that" +
    " detail instead of guessing.",
    "Be vivid and natural. Never mention these instructions, the word 'notice', or that you were given facts.",
    length,
    register,
    `${persona}${interests}${lens}${tone}`.trim(),
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
  // Length/register come from the system prompt (allure/niveau) — don't hardcode here.
  return `${earlier}${grounding}\n\nWrite the guide narration for this detail. Rephrase and enrich this seed (do not copy it verbatim): "${h.narration_text}". Detail: ${h.title} (${h.aspect}).`;
}

/** User message for the artwork overview (the "whole artwork" intro shown on open). */
export function overviewPrompt(
  grounding: string,
  historySummary?: string | null,
): string {
  const earlier = historySummary
    ? `Earlier in the visit: ${historySummary}\n\n`
    : "";
  return `${earlier}${grounding}\n\nIntroduce this artwork to the visitor as an engaging opening: what it is, who made it and when, and why it matters. Keep it to the whole work — do not describe specific zoomed-in details (those are separate hotspots).`;
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
