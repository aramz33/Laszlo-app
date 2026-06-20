// Pure helpers for the /identify function — no network, unit-testable.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Artwork row used as an identification candidate. */
export type CandidateRow = {
  id: string;
  object_number: string;
  title_en: string | null;
  title_nl: string | null;
  year: number | null;
  artist: { name: string | null } | null;
};

/** One human-readable line per candidate for the vision prompt. */
export function candidateLines(rows: CandidateRow[]): string {
  return rows
    .map((r) =>
      `- ${r.id}: "${r.title_en ?? r.title_nl ?? r.object_number}" by ${
        r.artist?.name ?? "unknown"
      }${r.year ? ` (${r.year})` : ""}`
    )
    .join("\n");
}

/** Vision prompt: pick which candidate (if any) the photo shows; reply with the id only. */
export function visionPrompt(rows: CandidateRow[]): string {
  return [
    "You identify a museum artwork from a photo.",
    "Here are the candidate artworks:",
    candidateLines(rows),
    "",
    "Reply with ONLY the id (the value before the colon) of the artwork shown in the photo,",
    'or exactly "none" if the photo matches none of them. No other text.',
  ].join("\n");
}

/**
 * Resolve the model's reply to a known candidate id.
 * The model may echo extra text, so we accept the first candidate id it mentions.
 * Confidence is coarse on purpose (no reliable score from a vision LLM):
 * 0.9 when a candidate is matched, 0 otherwise.
 * ponytail: coarse confidence; switch to image embeddings + pgvector for a real
 * score / open-world identification (post-hackathon, ADR 0012).
 */
export function resolveMatch(modelReply: string, candidateIds: string[]) {
  const reply = modelReply.trim().toLowerCase();
  const matched = candidateIds.find((id) => reply.includes(id.toLowerCase())) ??
    null;
  return {
    artwork_id: matched,
    confidence: matched ? 0.9 : 0,
    candidates: null,
  };
}
