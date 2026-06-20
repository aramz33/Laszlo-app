// Pure helpers for the /transcribe function — no network, unit-testable.

/** Demo cap on uploaded audio (ADR 0014: 10 MB / 20 s; size is the cheap guard). */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/** Scaleway transcription response: { text, usage: { type, seconds } }. */
type ScalewayTranscription = { text?: string; usage?: { seconds?: number } };

/**
 * Map the provider response to our contract shape { text, lang, duration_s }.
 * Basic transcription doesn't echo a detected language, so we return the caller's
 * `lang_hint` (or null) rather than inventing one.
 */
export function toTranscript(
  data: ScalewayTranscription,
  langHint: string | null,
) {
  return {
    text: (data.text ?? "").trim(),
    lang: langHint,
    duration_s: data.usage?.seconds ?? null,
  };
}
