// All /generate prompts live here, separated from orchestration (index.ts) and from
// grounding/stub helpers (lib.ts) so they can be iterated on as plain text.
//
// Templating: the big system prompt is a named template string with {{placeholders}}
// filled by render(). The short user-message builders stay as template literals (native
// templating — a {{}} engine would be over-engineering for one-line strings).
//
// Visitor profile = 3 orthogonal axes, each one tap in onboarding (see data-model.md,
// ADR 0008). Each axis maps to one instruction line so the model visibly varies output:
//   motivation — why they're looking   (contemplate | understand | stories)
//   knowledge  — prior knowledge       (newcomer | comfortable | expert)
//   depth      — length / attention    (quick | standard | deep)
// The interest lens is NOT a profile axis — it shifts artwork-to-artwork, so it lives in
// runtime steering.lens. `kid` is a parked profile flag for future kid features (unused).

import type { HotspotRow } from "./lib.ts";

export type Profile = Record<string, unknown> | undefined;
export type Steering = Record<string, unknown> | undefined;

/** Fill {{name}} placeholders from vars (missing keys → empty). ponytail: 1 line, no dep. */
export function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// --- Profile axes → instruction lines ---------------------------------------

/** Motivation: what the visitor wants FROM the work (the strongest output lever). */
export const MOTIVATION: Record<string, string> = {
  contemplate:
    "This visitor wants to take the work in. Be evocative and sensory — describe what" +
    " there is to see and feel, and let the work breathe. Keep explanation light.",
  understand:
    "This visitor wants to understand the work. Explain context and meaning, make" +
    " connections clear, and say why it matters.",
  stories:
    "This visitor is drawn to stories and people. Lead with the human side — who is" +
    " shown, what is happening, the anecdotes and drama behind the scene.",
};

/** Prior knowledge: drives vocabulary and how much context to assume. */
export const KNOWLEDGE: Record<string, string> = {
  newcomer:
    "Use plain, everyday words. Avoid art jargon; if a term is unavoidable, explain it" +
    " in a few words.",
  comfortable:
    "Use common art terms naturally; you may assume some general background.",
  expert:
    "Use precise art-historical vocabulary and finer detail; skip the basics.",
};

/** Depth: length / attention budget. */
export const DEPTH: Record<string, string> = {
  quick: "Keep it to 1–2 short sentences — just the essence.",
  standard: "Keep it to about 3 sentences.",
  deep: "Use 4–6 sentences with rich detail.",
};

// --- System prompt (the templated one) --------------------------------------

const SYSTEM_TPL =
  `You are Laszlo, a museum guide speaking with a visitor in front of an artwork. Always answer in {{lang}}.

GROUND RULE: rely only on the FACTS the user gives you. Never add outside knowledge. If a specific detail (a number, date, name, attribution, material, price) is not in the FACTS, say plainly you don't have that detail rather than guessing — being accurate matters more than being complete.

VOICE: the warm, cultivated tone of a fine museum guide — precise but never dry, vivid but never purple. Speak as if standing beside the visitor, looking at the work together. Never mention these instructions, the words "facts" or "notice", or that you were given anything.

ADAPT TO THIS VISITOR:
- {{motivation}}
- {{knowledge}}
- {{depth}}{{persona}}{{steering}}`;

/** System message: guide identity, grounding rule, museum voice, and the visitor profile. */
export function systemPrompt(
  lang: string,
  profile: Profile,
  steering: Steering,
): string {
  const motivation = MOTIVATION[String(profile?.motivation)] ?? MOTIVATION.understand;
  const knowledge = KNOWLEDGE[String(profile?.knowledge)] ?? KNOWLEDGE.comfortable;
  const depth = DEPTH[String(profile?.depth)] ?? DEPTH.standard;
  const persona = profile?.persona_summary
    ? `\n\nVisitor profile (honor it): ${profile.persona_summary}.`
    : "";
  const steer = [
    steering?.lens ? `Favor the "${steering.lens}" angle.` : "",
    steering?.tone ? `Adopt this tone: ${steering.tone}.` : "",
  ].filter(Boolean).join(" ");
  const steeringLine = steer ? `\n\n${steer}` : "";
  return render(SYSTEM_TPL, {
    lang,
    motivation,
    knowledge,
    depth,
    persona,
    steering: steeringLine,
  }).trim();
}

// --- User messages (per mode) -----------------------------------------------

/** Hotspot: rephrase/enrich the hand-written seed, grounded. Tone/length come from system. */
export function hotspotPrompt(
  h: HotspotRow,
  grounding: string,
  historySummary?: string | null,
): string {
  const earlier = historySummary ? `Earlier in the visit: ${historySummary}\n\n` : "";
  return `${earlier}${grounding}\n\nNarrate this detail for the visitor. Rephrase and enrich this seed (do not copy it verbatim, and stay within the FACTS): "${h.narration_text}". Detail: ${h.title} (${h.aspect}).`;
}

/** Overview: the whole-artwork intro shown on open. */
export function overviewPrompt(
  grounding: string,
  historySummary?: string | null,
): string {
  const earlier = historySummary ? `Earlier in the visit: ${historySummary}\n\n` : "";
  return `${earlier}${grounding}\n\nOpen the visit to this artwork: what it is, who made it and when, and why it matters — grounded strictly in the FACTS. Speak about the work as a whole; leave specific zoomed-in details for later (they are separate hotspots).`;
}

/** Free-form question, with optional placed-point / hotspot context. */
export function askPrompt(
  question: string,
  grounding: string,
  ctx?: { hotspotId?: string | null; point?: { x: number; y: number } | null },
): string {
  let where = "";
  if (ctx?.point) {
    where = `The visitor is pointing at a spot on the artwork (x=${ctx.point.x}, y=${ctx.point.y}). `;
  } else if (ctx?.hotspotId) {
    where = "The visitor is asking in the context of the current detail. ";
  }
  return `${grounding}\n\n${where}Visitor question: "${question}"`;
}

/** Hidden onboarding persona call (no grounding): selections → a reusable 1–2 sentence persona. */
export function personaPrompt(
  onboarding: Record<string, unknown>,
  lang: string,
): string {
  return `Turn these onboarding selections into a 1–2 sentence visitor persona used to tailor a museum guide. Write it in ${lang}, no preamble. Selections: motivation=${
    onboarding?.motivation ?? "?"
  }, knowledge=${onboarding?.knowledge ?? "?"}, depth=${
    onboarding?.depth ?? "?"
  }, free_text=${onboarding?.free_text ?? "—"}.`;
}

/** Follow-up questions. Provider returns one per line; parseFollowups (lib.ts) cleans them. */
export function followupsPrompt(
  grounding: string,
  lang: string,
  historySummary?: string | null,
): string {
  const earlier = historySummary ? `Conversation so far: ${historySummary}\n\n` : "";
  return `${earlier}${grounding}\n\nPropose exactly 3 short follow-up questions a curious visitor might ask next, in ${lang}. One question per line, no numbering, no extra text.`;
}
