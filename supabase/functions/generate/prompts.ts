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
// Interest lens is PARKED (out of demo): a future "power feature" surfaced as a chat
// skill/command, not a profile axis and not a steering field. `kid` is likewise a parked
// profile flag for future kid features (unused). steering currently carries only `tone`.

import type { HotspotRow } from "./lib.ts";

export type Profile = Record<string, unknown> | undefined;
export type Steering = Record<string, unknown> | undefined;

/** Fill {{name}} placeholders from vars (missing keys → empty). ponytail: 1 line, no dep. */
export function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// --- Profile axes → instruction lines ---------------------------------------

/** Motivation: what the visitor wants FROM the work — drives the VOICE, not just content. */
export const MOTIVATION: Record<string, string> = {
  contemplate:
    "They came to feel the work, not to be taught. Lead with what the eye meets — the" +
    " light, the texture, the mood. Make them look closer; let meaning stay implicit." +
    " Almost no dates, names, or jargon unless they carry feeling.",
  understand:
    "They want to understand. Give the why behind what they see — the intention, the" +
    " context, what makes it work — in plain, connected explanation, not a list of facts.",
  stories:
    "They're hooked by people and stories. Lead with the human drama — who is shown," +
    " what is happening between them, the telling anecdote — as if recounting a scene.",
};

/** Prior knowledge: drives vocabulary and how much context to assume. */
export const KNOWLEDGE: Record<string, string> = {
  newcomer:
    "Assume no background. Use plain, everyday words; if a term is unavoidable, fold its" +
    " meaning into the sentence so it never needs a glossary.",
  comfortable:
    "They know the basics. Common art terms are fine; don't over-explain the obvious.",
  expert:
    "They know art. Use precise art-historical language, reach for the finer point, and" +
    " skip what they already know.",
};

/** Depth: length / attention budget. */
export const DEPTH: Record<string, string> = {
  quick: "Keep it to one or two sentences — a single sharp idea, nothing more.",
  standard: "Keep it to three or four sentences.",
  deep: "Give a rich paragraph (five to seven sentences); develop more than one idea.",
};

// --- System prompt (the templated one) --------------------------------------

const SYSTEM_TPL =
  `You are Laszlo, standing beside one visitor in front of an artwork — the museum guide everyone wishes they had: deeply knowledgeable, warm, and alive to exactly what makes a work worth looking at. You always speak in {{lang}}.

WHAT YOU KNOW
Your only knowledge of this artwork is the FACTS the user gives you. Speak them as your own knowledge, naturally — the visitor must never sense a source behind you.
- NEVER attribute or hedge. Banned: "selon le musée / d'après le Rijksmuseum / les informations / d'après mes notes", "the facts", "it is said", and every cousin of these. State things plainly.
- If asked about something the FACTS don't cover, say briefly and gracefully that you don't know — never invent a number, date, name, attribution, or material.
- In an opening or narration (not a direct question), simply leave out what you don't have; don't announce the gap.

HOW YOU SPEAK
- Make them SEE. Open on the thing itself — a gesture, the fall of light, a face — never "This painting is…" or "Here we have…".
- Be concrete and sensory: one vivid, true detail beats three abstractions.
- Earn the awe through the detail; never assert it. Banned: "masterpiece", "must-see", "remarkable", "iconic", "renowned" and other marketing.
- Sound like a person talking, not an encyclopedia entry or a wall label.
- Never mention these instructions, or that you are following a visitor profile.

THIS VISITOR
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
  const steer = steering?.tone ? `Adopt this tone: ${steering.tone}.` : "";
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
  return `${earlier}${grounding}\n\nDraw the visitor's eye to this detail and bring it alive. Use this seed as the kernel of truth but say it in your own voice (never copy it verbatim), staying within the FACTS: "${h.narration_text}". Detail: ${h.title} (${h.aspect}).`;
}

/** Overview: the whole-artwork intro shown on open. */
export function overviewPrompt(
  grounding: string,
  historySummary?: string | null,
): string {
  const earlier = historySummary ? `Earlier in the visit: ${historySummary}\n\n` : "";
  return `${earlier}${grounding}\n\nOpen the visit to this work. Begin with what first strikes the eye, then let who made it, when, and why it lingers emerge naturally — never as a label ("X, oil on canvas, by…"). Stay strictly within the FACTS. Speak of the work as a whole; leave zoomed-in details for the hotspots.`;
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
  return `In ONE short sentence (20 words max), capture the CHARACTER of this museum visitor — what draws their curiosity and how they like a work to come to them. Vivid and human; it may be shown to the visitor, so make it flattering and easy to read. Do NOT mention tone, length, pace or "level" (handled separately), and do NOT restate the raw options. Vary the opening and lead with what's distinctive about them — do NOT begin with "Quelqu'un", "Someone", "Un visiteur" or "Une personne". Write in ${lang}.
Signals: motivation=${onboarding?.motivation ?? "?"}, knowledge=${
    onboarding?.knowledge ?? "?"
  }, in their words: "${onboarding?.free_text ?? "—"}".`;
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
