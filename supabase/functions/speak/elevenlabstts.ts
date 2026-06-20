// ElevenLabs TTS. Needs ELEVENLABS_API_KEY.
// POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
// → MP3 bytes in the response body.
//
// Uses eleven_multilingual_v2 for native FR / NL / EN support — highest quality
// engine available.
//
// Voice selection matters: to sound natively French (or Dutch), use a voice that was
// cloned/trained from a native speaker of that language. The ELEVENLABS_VOICE_ID secret
// should be set to such a voice (browse elevenlabs.io/app/voice-library, filter by
// language). The default voice ID is an English voice — it will speak other languages
// with an English accent.
//
// `language_code` is passed to help ElevenLabs prioritise pronunciation for the target
// language even when the base voice is not a native speaker of it.
//
// Speed is not directly mapped (ElevenLabs voice_settings use stability/similarity_boost,
// not a prosody rate).

/**
 * Pick the best voice for the requested language.
 * Priority: ELEVENLABS_VOICE_ID_<LANG> → ELEVENLABS_VOICE_ID → built-in default.
 * Built-in defaults are native-speaker voices for FR and NL; EN keeps Sarah.
 */
function voiceForLang(lang: string): string {
  const langKey = `ELEVENLABS_VOICE_ID_${lang.toUpperCase()}`;
  // Per-language override (e.g. ELEVENLABS_VOICE_ID_FR, ELEVENLABS_VOICE_ID_NL)
  try {
    const perLang = Deno.env.get(langKey);
    if (perLang) return perLang;
    // Global override
    const global_ = Deno.env.get("ELEVENLABS_VOICE_ID");
    if (global_) return global_;
  } catch { /* no --allow-env in tests; fall through to defaults */ }
  // Built-in defaults — native-speaker voices for each language.
  const DEFAULTS: Record<string, string> = {
    fr: "DGTOOUoGpoP6UZ9uSWfA", // Célian — warm documentary narrator (FR standard)
    nl: "MqvxHuZP0MWXPlNUh65f", // Daniel van der Meer — calm native Dutch
    en: "EXAVITQu4vr4xnSDxMaL", // Sarah — American English (confirmed great quality)
  };
  return DEFAULTS[lang] ?? DEFAULTS.en;
}

/** Synthesize `text` to MP3 bytes via ElevenLabs. Throws if the key is missing or the call fails. */
export async function elevenLabsTts(
  text: string,
  lang: string,
): Promise<Uint8Array> {
  // Read env lazily so importing this module needs no --allow-env (keeps tests flagless).
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) throw new Error("ELEVENLABS_API_KEY not set");

  const voiceId = voiceForLang(lang);
  const model = Deno.env.get("ELEVENLABS_MODEL") ?? "eleven_multilingual_v2";

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        language_code: lang, // helps ElevenLabs prioritise pronunciation for the target language
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`elevenlabs tts ${res.status}: ${await res.text()}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
