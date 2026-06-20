import type { Artwork } from "../domain/artwork";

export type RuntimeLanguage = "fr" | "en" | "nl";
export type HotspotStatus = "idle" | "loading" | "ready" | "fallback" | "error";
export type VoiceChoice = "default" | "warm" | "calm";
export type ToneChoice = "neutral" | "calm";
export type SpeedChoice = 0.9 | 1 | 1.1;

export type RuntimeProfile = {
  allure: "court" | "moyen" | "long";
  niveau: "decouverte" | "amateur" | "passionne";
  interets: string[];
  free_text: string | null;
  persona_summary: string | null;
};

export type RuntimeSource = {
  source: "rijks" | "wikipedia" | string;
  lang: "en" | "nl" | string;
  notice_id: string | null;
};

export type HotspotGenerateItem = {
  hotspot_id: string;
  status: "ready" | "error";
  text: string | null;
  message: string | null;
  sources: RuntimeSource[];
};

export type HotspotGenerateResponse = {
  type: "done";
  request_id: string;
  items: HotspotGenerateItem[];
};

export type AskEvent =
  | { type: "delta"; request_id: string; delta: string }
  | { type: "done"; request_id: string; text: string; sources: RuntimeSource[] }
  | { type: "error"; request_id: string; message: string };

export type ConversationTurn = { role: "user" | "assistant"; content: string };

export type SpeakResponse = {
  audio_url: string;
  format: "mp3";
  duration_s: number | null;
};

export const defaultRuntimeProfile: RuntimeProfile = {
  allure: "court",
  niveau: "decouverte",
  interets: ["technique", "stories"],
  free_text: null,
  persona_summary: null
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const hasRuntimeConfig = Boolean(supabaseUrl && anonKey);

const runtimeBaseUrl = () => `${supabaseUrl}/functions/v1`;

const jsonHeaders = () => ({
  "Content-Type": "application/json",
  apikey: anonKey as string,
  Authorization: `Bearer ${anonKey}`
});

export function createRequestId() {
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function postJson<T>(fn: string, body: unknown): Promise<T> {
  const response = await fetch(`${runtimeBaseUrl()}/${fn}`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${fn} failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export async function generateHotspotBatch(request: {
  request_id: string;
  artwork: Artwork;
  lang: RuntimeLanguage;
  profile: RuntimeProfile;
}): Promise<HotspotGenerateResponse> {
  if (!hasRuntimeConfig) {
    return mockHotspotBatch(request);
  }

  return postJson<HotspotGenerateResponse>("generate", {
    request_id: request.request_id,
    mode: "hotspot",
    artwork_id: request.artwork.id,
    hotspot_ids: request.artwork.hotspots.map((hotspot) => hotspot.id),
    lang: request.lang,
    profile: request.profile,
    steering: { tone: null, lens: null },
    history_summary: null,
    history: []
  });
}

function parseSseFrame(frame: string): AskEvent | null {
  const line = frame.split("\n").find((l) => l.startsWith("data:"));
  if (!line) {
    return null;
  }
  try {
    return JSON.parse(line.slice(5).trim()) as AskEvent;
  } catch {
    return null;
  }
}

async function streamAsk(
  body: unknown,
  onEvent: (event: AskEvent) => void
): Promise<AskEvent | null> {
  const response = await fetch(`${runtimeBaseUrl()}/generate`, {
    method: "POST",
    headers: { ...jsonHeaders(), Accept: "text/event-stream" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ask failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  let last: AskEvent | null = null;
  const dispatch = (chunk: string, carry: string): string => {
    const buffer = carry + chunk;
    const frames = buffer.split("\n\n");
    const rest = frames.pop() ?? "";
    for (const frame of frames) {
      const event = parseSseFrame(frame);
      if (event) {
        last = event;
        onEvent(event);
      }
    }
    return rest;
  };

  const reader =
    response.body && typeof (response.body as ReadableStream).getReader === "function"
      ? (response.body as ReadableStream<Uint8Array>).getReader()
      : null;

  if (reader) {
    const decoder = new TextDecoder();
    let carry = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      carry = dispatch(decoder.decode(value, { stream: true }), carry);
    }
    dispatch("\n\n", carry);
  } else {
    const text = await response.text();
    dispatch(text.endsWith("\n\n") ? text : `${text}\n\n`, "");
  }

  return last;
}

export async function generateAsk(request: {
  request_id: string;
  artwork: Artwork;
  hotspot_id: string | null;
  question: string;
  lang: RuntimeLanguage;
  profile: RuntimeProfile;
  history?: ConversationTurn[];
  history_summary?: string | null;
  onEvent: (event: AskEvent) => void;
}) {
  if (!hasRuntimeConfig) {
    return mockAsk(request);
  }

  return streamAsk(
    {
      request_id: request.request_id,
      mode: "ask",
      artwork_id: request.artwork.id,
      question: request.question,
      hotspot_id: request.hotspot_id,
      point: null,
      lang: request.lang,
      profile: request.profile,
      steering: { tone: null, lens: null },
      history_summary: request.history_summary ?? null,
      history: request.history ?? []
    },
    request.onEvent
  );
}

export async function speakText(request: {
  text: string;
  lang: RuntimeLanguage;
  voice: VoiceChoice;
  speed: SpeedChoice;
  tone: ToneChoice;
}): Promise<SpeakResponse> {
  if (!hasRuntimeConfig) {
    return mockSpeak(request);
  }

  return postJson<SpeakResponse>("speak", {
    text: request.text,
    lang: request.lang,
    voice: request.voice,
    speed: request.speed,
    tone: request.tone
  });
}

export async function transcribe(request: {
  uri: string;
  lang_hint?: RuntimeLanguage;
}): Promise<{ text: string; lang: string; duration_s: number | null }> {
  const form = new FormData();
  form.append("audio", {
    uri: request.uri,
    name: "question.m4a",
    type: "audio/m4a"
  } as unknown as Blob);
  if (request.lang_hint) {
    form.append("lang_hint", request.lang_hint);
  }

  const response = await fetch(`${runtimeBaseUrl()}/transcribe`, {
    method: "POST",
    headers: { apikey: anonKey as string, Authorization: `Bearer ${anonKey}` },
    body: form
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`transcribe failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return response.json();
}

export async function identify(request: {
  uri: string;
  candidate_ids: string[];
  lang_hint?: RuntimeLanguage;
}): Promise<{ artwork_id: string | null; confidence: number; candidates: unknown[] }> {
  const form = new FormData();
  form.append("image", {
    uri: request.uri,
    name: "frame.jpg",
    type: "image/jpeg"
  } as unknown as Blob);
  for (const id of request.candidate_ids) {
    form.append("candidate_ids", id);
  }
  if (request.lang_hint) {
    form.append("lang_hint", request.lang_hint);
  }

  const response = await fetch(`${runtimeBaseUrl()}/identify`, {
    method: "POST",
    headers: { apikey: anonKey as string, Authorization: `Bearer ${anonKey}` },
    body: form
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`identify failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return response.json();
}

// Offline fallback so the demo never blanks when Supabase config is absent.
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const localizedLead: Record<RuntimeLanguage, string> = {
  fr: "Regarde ce detail",
  en: "Look at this detail",
  nl: "Kijk naar dit detail"
};

const localizedAskLead: Record<RuntimeLanguage, string> = {
  fr: "Version courte",
  en: "Short version",
  nl: "Korte versie"
};

const mockSource = (artwork: Artwork): RuntimeSource[] => [
  {
    source: "rijks",
    lang: "en",
    notice_id: artwork.notices?.find((n) => n.source === "rijks" && n.lang === "en")?.id ?? null
  }
];

async function mockHotspotBatch(request: {
  request_id: string;
  artwork: Artwork;
  lang: RuntimeLanguage;
}): Promise<HotspotGenerateResponse> {
  await wait(3400);
  return {
    type: "done",
    request_id: request.request_id,
    items: request.artwork.hotspots.map((hotspot) => ({
      hotspot_id: hotspot.id,
      status: "ready",
      text: `${localizedLead[request.lang]}: ${hotspot.narrationText}`,
      message: null,
      sources: mockSource(request.artwork)
    }))
  };
}

async function mockAsk(request: {
  request_id: string;
  artwork: Artwork;
  question: string;
  lang: RuntimeLanguage;
  onEvent: (event: AskEvent) => void;
}) {
  const text = `${localizedAskLead[request.lang]}: ${request.artwork.title} — ${request.question}`;
  const chunks = text.match(/.{1,36}(\s|$)/g) ?? [text];
  for (const chunk of chunks) {
    await wait(120);
    request.onEvent({ type: "delta", request_id: request.request_id, delta: chunk });
  }
  const done: AskEvent = {
    type: "done",
    request_id: request.request_id,
    text,
    sources: mockSource(request.artwork)
  };
  request.onEvent(done);
  return done;
}

async function mockSpeak(request: { text: string; speed: SpeedChoice }): Promise<SpeakResponse> {
  await wait(250);
  return {
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    format: "mp3",
    duration_s: Math.max(3, Math.round((request.text.length / 14 / request.speed) * 10) / 10)
  };
}
