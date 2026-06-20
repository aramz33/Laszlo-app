// Minimal OpenAI-compatible LLM client (Scaleway Generative APIs).
//
// ponytail: plain fetch, no SDK — Scaleway exposes the standard /chat/completions
// shape, so one POST covers it. Swapping provider = changing SCW_* env vars only.

const BASE = Deno.env.get("SCW_BASE_URL")!; // e.g. https://api.scaleway.ai/v1
const KEY = Deno.env.get("SCW_API_KEY")!;
// EU, strong French, small/fast. Override with SCW_MODEL if a run needs another.
const MODEL = Deno.env.get("SCW_MODEL") ??
  "mistral-small-3.2-24b-instruct-2506";

export type Msg = { role: "system" | "user" | "assistant"; content: string };

/** Non-streaming completion — returns the full assistant text. */
export async function complete(
  messages: Msg[],
  temperature = 0.5,
): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Streaming completion — yields text deltas as they arrive. Parses the provider's
 * OpenAI-style SSE (`data: {json}` lines, terminated by `data: [DONE]`).
 */
export async function* streamDeltas(
  messages: Msg[],
  temperature = 0.5,
): AsyncGenerator<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, temperature, stream: true }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`LLM ${res.status}: ${await res.text()}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    // SSE events are newline-delimited; keep the last partial line in the buffer.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // Ignore keep-alive / non-JSON lines.
      }
    }
  }
}
