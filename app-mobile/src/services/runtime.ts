import type { Artwork, Hotspot } from "../domain/artwork";
import { hasSupabaseConfig } from "./supabase";

/**
 * Typed client for the Laszlo runtime Edge Functions (`/generate`, `/speak`,
 * `/transcribe`, `/identify`). Canonical contract: ADR 0014 and
 * supabase/functions/API.md. The app sends ids + preferences only — never the
 * notice/grounding text. When Supabase is not configured, calls fall back to a
 * local mock so the UI is exercisable before the backend is reachable.
 */

export type Lang = "fr" | "en" | "nl";
export type Lens = "technique" | "people" | "stories" | "symbols";

export type Profile = {
  allure?: string;
  niveau?: string;
  interets?: string[];
  free_text?: string | null;
  persona_summary?: string | null;
};

export type Steering = {
  tone?: string | null;
  lens?: Lens | null;
};

export type Source = {
  source: "rijks" | "wikipedia";
  lang: "en" | "nl";
  notice_id: string | null;
};

export type HotspotItem = {
  hotspot_id: string;
  status: "ready" | "error";
  text: string | null;
  message: string | null;
  sources: Source[];
};

export type HotspotResponse = {
  type: "done";
  request_id: string;
  items: HotspotItem[];
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const BASE = `${SUPABASE_URL ?? ""}/functions/v1`;

function jsonHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${ANON_KEY ?? ""}`,
    "Content-Type": "application/json"
  };
}

export function newRequestId(): string {
  // RFC4122-ish v4; good enough to correlate batch <-> response on-device.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type GenerateHotspotsArgs = {
  artworkId: string;
  hotspotIds: string[];
  lang: Lang;
  profile?: Profile;
  steering?: Steering;
};

export async function generateHotspots(
  args: GenerateHotspotsArgs
): Promise<HotspotResponse> {
  const request_id = newRequestId();

  if (!hasSupabaseConfig) {
    return mockHotspotResponse(request_id, args);
  }

  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      request_id,
      mode: "hotspot",
      artwork_id: args.artworkId,
      hotspot_ids: args.hotspotIds,
      lang: args.lang,
      profile: args.profile,
      steering: args.steering
    })
  });

  if (!res.ok) {
    throw new Error(`generate(hotspot) failed: ${res.status}`);
  }

  return (await res.json()) as HotspotResponse;
}

export type PersonaArgs = {
  lang: Lang;
  onboarding: {
    allure?: string;
    niveau?: string;
    interets?: string[];
    free_text?: string | null;
  };
};

export async function generatePersona(args: PersonaArgs): Promise<string> {
  if (!hasSupabaseConfig) {
    const interets = args.onboarding.interets?.join(", ") || "art";
    return `Visitor interested in ${interets}, ${args.onboarding.niveau ?? "amateur"} level, prefers ${args.onboarding.allure ?? "medium"} explanations.`;
  }

  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      request_id: newRequestId(),
      mode: "persona",
      lang: args.lang,
      onboarding: args.onboarding
    })
  });

  if (!res.ok) {
    throw new Error(`generate(persona) failed: ${res.status}`);
  }

  const data = (await res.json()) as { persona_summary: string };
  return data.persona_summary;
}

export type Point = { x: number; y: number };

export type ChatRole = "user" | "assistant";

export type HistoryMessage = {
  role: ChatRole;
  content: string;
  artwork_id: string | null;
};

export type AskArgs = {
  artworkId: string;
  question: string;
  lang: Lang;
  hotspotId?: string | null;
  point?: Point | null;
  profile?: Profile;
  steering?: Steering;
  history?: HistoryMessage[];
  historySummary?: string | null;
};

export type AskHandlers = {
  onDelta: (delta: string) => void;
  onDone: (text: string, sources: Source[]) => void;
  onError: (message: string) => void;
};

/** Caps client-held history to 8 messages (4 turns) per ADR 0014. */
export const HISTORY_CAP = 8;

export function capHistory(history: HistoryMessage[]): HistoryMessage[] {
  return history.slice(-HISTORY_CAP);
}

/**
 * Streams a `mode=ask` answer. React Native's fetch cannot read a streaming
 * response body, so this uses XMLHttpRequest and parses the SSE `data:` lines
 * incrementally from responseText. Returns an abort function.
 */
export function askStream(args: AskArgs, handlers: AskHandlers): () => void {
  if (!hasSupabaseConfig) {
    return mockAskStream(args, handlers);
  }

  const request_id = newRequestId();
  const xhr = new XMLHttpRequest();
  let processed = 0;
  let done = false;

  const processChunk = () => {
    const chunk = xhr.responseText.slice(processed);
    const lines = chunk.split("\n");
    // keep the last (possibly partial) line buffered
    const remainder = lines.pop() ?? "";
    processed += chunk.length - remainder.length;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try {
        const ev = JSON.parse(payload) as {
          type: string;
          delta?: string;
          text?: string;
          sources?: Source[];
          message?: string;
        };
        if (ev.type === "delta" && ev.delta) {
          handlers.onDelta(ev.delta);
        } else if (ev.type === "done") {
          done = true;
          handlers.onDone(ev.text ?? "", ev.sources ?? []);
        } else if (ev.type === "error") {
          done = true;
          handlers.onError(ev.message ?? "stream error");
        }
      } catch {
        // ignore partial / non-JSON keepalive lines
      }
    }
  };

  xhr.open("POST", `${BASE}/generate`);
  xhr.setRequestHeader("Authorization", `Bearer ${ANON_KEY ?? ""}`);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.onreadystatechange = () => {
    if (xhr.readyState >= 3) {
      processChunk();
    }
    if (xhr.readyState === 4 && !done) {
      if (xhr.status >= 200 && xhr.status < 300) {
        handlers.onDone("", []);
      } else {
        handlers.onError(`ask failed: ${xhr.status}`);
      }
    }
  };
  xhr.onerror = () => {
    if (!done) handlers.onError("network error");
  };
  xhr.send(
    JSON.stringify({
      request_id,
      mode: "ask",
      artwork_id: args.artworkId,
      question: args.question,
      lang: args.lang,
      hotspot_id: args.hotspotId ?? null,
      point: args.point ?? null,
      profile: args.profile,
      steering: args.steering,
      history: args.history ? capHistory(args.history) : undefined,
      history_summary: args.historySummary ?? null
    })
  );

  return () => {
    if (!done) xhr.abort();
  };
}

function mockAskStream(args: AskArgs, handlers: AskHandlers): () => void {
  const answer = `(mock) Here's a thought about "${args.question}". Connect Supabase to stream a real grounded answer.`;
  const words = answer.split(" ");
  let i = 0;
  let cancelled = false;
  const tick = () => {
    if (cancelled) return;
    if (i < words.length) {
      handlers.onDelta((i === 0 ? "" : " ") + words[i]);
      i += 1;
      setTimeout(tick, 40);
    } else {
      handlers.onDone(answer, []);
    }
  };
  setTimeout(tick, 120);
  return () => {
    cancelled = true;
  };
}

export type FollowupsArgs = {
  artworkId: string;
  hotspotId?: string | null;
  lang: Lang;
  profile?: Profile;
  historySummary?: string | null;
};

export async function generateFollowups(
  args: FollowupsArgs
): Promise<string[]> {
  if (!hasSupabaseConfig) {
    return [
      "What technique did the artist use here?",
      "Who are the people in this scene?",
      "What does this detail symbolize?"
    ];
  }

  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      request_id: newRequestId(),
      mode: "followups",
      artwork_id: args.artworkId,
      hotspot_id: args.hotspotId ?? null,
      lang: args.lang,
      profile: args.profile,
      history_summary: args.historySummary ?? null
    })
  });

  if (!res.ok) {
    throw new Error(`generate(followups) failed: ${res.status}`);
  }

  const data = (await res.json()) as { questions: string[] };
  return data.questions;
}

function mockHotspotResponse(
  request_id: string,
  args: GenerateHotspotsArgs
): HotspotResponse {
  return {
    type: "done",
    request_id,
    items: args.hotspotIds.map((hotspot_id) => ({
      hotspot_id,
      status: "ready",
      text: null,
      message: "mock: Supabase not configured",
      sources: []
    }))
  };
}

/** Resolve the best text for a hotspot: generated text if ready, else the
 * locally stored narration_text seed. */
export function resolveHotspotText(
  hotspot: Hotspot,
  item: HotspotItem | undefined
): string {
  if (item && item.status === "ready" && item.text) {
    return item.text;
  }
  return hotspot.narrationText;
}

export type SpeakArgs = {
  text: string;
  lang: Lang;
  provider?: "auto" | "edge" | "mistral" | "google" | "elevenlabs";
  speed?: number;
};

export type SpeakResponse = {
  audio_url: string;
  format: string;
  duration_s: number | null;
  engine: string;
};

export async function speak(args: SpeakArgs): Promise<SpeakResponse> {
  if (!hasSupabaseConfig) {
    return mockSpeakResponse();
  }

  const res = await fetch(`${BASE}/speak`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      text: args.text,
      lang: args.lang,
      provider: args.provider ?? "auto",
      speed: args.speed ?? 1
    })
  });

  if (!res.ok) {
    throw new Error(`speak failed: ${res.status}`);
  }

  return (await res.json()) as SpeakResponse;
}

function mockSpeakResponse(): SpeakResponse {
  return {
    audio_url: "",
    format: "mp3",
    duration_s: null,
    engine: "mock"
  };
}

export const HOTSPOT_FALLBACK_MS = 3000;

export function defaultLang(): Lang {
  return "en";
}

export function hotspotIdsOf(artwork: Artwork): string[] {
  return artwork.hotspots.map((h) => h.id);
}
