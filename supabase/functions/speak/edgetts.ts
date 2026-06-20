// Microsoft Edge "read aloud" TTS — keyless neural voices, no length limit.
// This is the same free service the `edge-tts` tooling uses: a WebSocket to Bing's
// speech endpoint, authorized by a time-based token (no account/API key).
//
// ponytail: ~one screen of protocol code, but it buys Azure-quality voices for free.
// If Microsoft changes the token scheme it can break — /speak falls back to Google TTS.

const TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const GEC_VERSION = "1-130.0.2849.68";
const WIN_EPOCH = 11644473600n; // seconds between 1601 and 1970

/** One good neural voice per language. */
const VOICES: Record<string, string> = {
  fr: "fr-FR-DeniseNeural",
  en: "en-US-AriaNeural",
  nl: "nl-NL-ColetteNeural",
};

/** Time-based auth token Microsoft requires: SHA-256 of (5-min-rounded ticks + trusted token). */
async function gecToken(): Promise<string> {
  const now = BigInt(Math.floor(Date.now() / 1000));
  let ticks = now + WIN_EPOCH;
  ticks -= ticks % 300n; // round down to 5 minutes
  ticks *= 10_000_000n; // to 100-nanosecond units
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ticks}${TRUSTED_TOKEN}`),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0"))
    .join("").toUpperCase();
}

/** `speed` (1 = normal) -> SSML prosody rate, e.g. 1.1 -> "+10%". */
function rate(speed: number): string {
  const pct = Math.round((speed - 1) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

/** Synthesize `text` to MP3 bytes via Edge TTS. Throws on any protocol error. */
export async function edgeTts(
  text: string,
  lang: string,
  speed = 1,
): Promise<Uint8Array> {
  const voice = VOICES[lang] ?? VOICES.fr;
  const locale = voice.slice(0, 5);
  const token = await gecToken();
  const url =
    `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_TOKEN}&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=${GEC_VERSION}`;

  const ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";

  const ssml =
    `<speak version='1.0' xml:lang='${locale}'><voice name='${voice}'>` +
    `<prosody rate='${rate(speed)}' pitch='+0Hz'>${
      escapeXml(text)
    }</prosody></voice></speak>`;

  return await new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    ws.onopen = () => {
      // 1) audio output format
      ws.send(
        `X-Timestamp:${
          new Date().toISOString()
        }\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`,
      );
      // 2) the text to speak
      ws.send(
        `X-RequestId:${
          crypto.randomUUID().replaceAll("-", "")
        }\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${
          new Date().toISOString()
        }\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    };
    ws.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        if (ev.data.includes("Path:turn.end")) {
          ws.close();
          resolve(concat(chunks));
        }
        return;
      }
      // Binary frame: [2-byte big-endian header length][header][audio bytes].
      const bytes = new Uint8Array(ev.data as ArrayBuffer);
      const headerLen = (bytes[0] << 8) | bytes[1];
      const header = new TextDecoder().decode(bytes.subarray(2, 2 + headerLen));
      if (header.includes("Path:audio")) {
        chunks.push(bytes.subarray(2 + headerLen));
      }
    };
    ws.onerror = () => reject(new Error("edge-tts websocket error"));
  });
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!
  ));
}
