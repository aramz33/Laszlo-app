// Pure helpers for the /speak function — no network, unit-testable.

/** Max characters per Google TTS request (keyless endpoint caps ~200). */
export const TTS_CHUNK = 180;

/** Safety cap so a huge text can't fan out into hundreds of requests. */
export const MAX_CHUNKS = 40;

/**
 * Split text into <=`max`-char chunks on word boundaries (the keyless TTS truncates
 * longer requests). A single word longer than `max` becomes its own chunk.
 */
export function chunkText(text: string, max = TTS_CHUNK): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && (current.length + 1 + word.length) > max) {
      chunks.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Keyless Google Translate TTS URL for one chunk. */
export function googleTtsUrl(chunk: string, lang: string): string {
  const q = encodeURIComponent(chunk);
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${q}`;
}
