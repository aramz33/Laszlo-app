# Laszlo runtime API — client guide (for the app)

How the mobile app calls the backend. Canonical contract:
[ADR 0014](../../docs/adr/0014-runtime-generation-edge-function.md). This doc is
the practical client view with copy-paste TypeScript.

## Basics

- **Base URL**: `https://spbrkgoseabpsxzkkyzj.supabase.co/functions/v1`
- **Auth**: every call needs `Authorization: Bearer <publishable anon key>` (the
  `sb_publishable_…` key, safe in the app). Missing it → `401`.
- Bodies are JSON, except `transcribe`/`identify` which are
  `multipart/form-data`.
- The client sends **ids and preferences, never the notice/grounding text** —
  the server re-reads facts itself.

```ts
const BASE = "https://spbrkgoseabpsxzkkyzj.supabase.co/functions/v1";
const headers = {
  "Authorization": `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};
```

## `POST /generate` — text, 4 modes

Shared optional fields: `request_id` (echoed back), `lang` (`fr|en|nl`),
`profile` (`{ allure, niveau, interets[], free_text, persona_summary }`),
`steering` (`{ tone, lens }`), `history` (capped 8), `history_summary`.

### mode `persona` — onboarding → persona_summary (call once, store on device)

```ts
const r = await fetch(`${BASE}/generate`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    mode: "persona",
    lang: "fr",
    onboarding: {
      allure: "court",
      niveau: "amateur",
      interets: ["technique"],
      free_text: "j'aime la lumière",
    },
  }),
});
const { persona_summary } = await r.json(); // store it; inject into profile.persona_summary later
```

### mode `hotspot` — batch, when the artwork opens

One call for all visible hotspots. Returns per-hotspot items; show `text`, fall
back to the local `narration_text` if an item isn't ready within ~3 s.

```ts
const r = await fetch(`${BASE}/generate`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    mode: "hotspot",
    artwork_id,
    hotspot_ids: [id1, id2],
    lang: "fr",
    profile,
    steering,
  }),
});
const { items } = await r.json();
// items: [{ hotspot_id, status: "ready"|"error", text, message, sources: [{source,lang,notice_id}] }]
```

### mode `ask` — SSE stream (chat / placed point / from a hotspot)

Response is `text/event-stream`: many `delta` events then one `done` (or
`error`). Read it incrementally for the typewriter effect / to start TTS early.

```ts
const res = await fetch(`${BASE}/generate`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    mode: "ask",
    artwork_id,
    question,
    lang: "fr",
    hotspot_id: currentHotspotId ?? null, // optional context
    point: placedPoint ?? null, // { x, y } if asking about a spot
    profile,
    steering,
    history,
    history_summary,
  }),
});
const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
let buf = "";
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += value;
  const lines = buf.split("\n");
  buf = lines.pop()!;
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const ev = JSON.parse(line.slice(5));
    if (ev.type === "delta") appendToBubble(ev.delta);
    else if (ev.type === "done") finish(ev.text, ev.sources);
    else if (ev.type === "error") showError(ev.message);
  }
}
```

### mode `followups` — 3 suggested questions (on hotspot open / after a chat turn)

```ts
const r = await fetch(`${BASE}/generate`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    mode: "followups",
    artwork_id,
    hotspot_id: currentHotspotId ?? null,
    lang: "fr",
    profile,
    history_summary,
  }),
});
const { questions } = await r.json(); // string[3]; tapping one -> mode "ask"
```

## `POST /transcribe` — voice → text (multipart)

Record with Expo, upload the file. Blocking step before an `ask` from voice.

```ts
const form = new FormData();
form.append("audio", { uri, name: "a.m4a", type: "audio/m4a" } as any);
form.append("lang_hint", "fr");
const r = await fetch(`${BASE}/transcribe`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${ANON_KEY}` },
  body: form,
}); // no Content-Type, let fetch set it
const { text, lang, duration_s } = await r.json();
```

Limits: 10 MB / ~20 s. Missing file → `400`.

## `POST /identify` — photo → artwork_id (AR fallback, multipart)

When ViroReact can't recognize the painting: send a frame + the artworks loaded
for the room.

```ts
const form = new FormData();
form.append("image", { uri, name: "p.jpg", type: "image/jpeg" } as any);
form.append("candidate_ids", roomArtworkIds.join(",")); // optional; empty = whole trackable set
const r = await fetch(`${BASE}/identify`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${ANON_KEY}` },
  body: form,
});
const { artwork_id, confidence } = await r.json(); // artwork_id null -> show manual/QR picker
```

## `POST /speak` — text → playable audio URL

`generate` is text-only; call `speak` to get audio. Returns a short MP3 URL
(play it; don't expect base64). `engine` says which TTS produced it.

```ts
const r = await fetch(`${BASE}/speak`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    text,
    lang: "fr",
    provider: "auto", // "edge" | "mistral" | "google" | "auto"
    speed: 1, // edge honors it
  }),
});
const { audio_url, format, engine } = await r.json();
// play audio_url (expo-av). engine="google" often means edge was throttled (still fine).
```

Notes: `edge` = best FR/NL but Microsoft throttles it (auto-falls back to
google); `mistral` = English voices only; `google` = robotic but always works.

## Suggested flow

`onboarding → persona (store)` · `open artwork → hotspot batch` ·
`tap hotspot → show text,
followups, /speak audio` ·
`ask (text/voice) → /transcribe? → /generate ask (SSE) → /speak` ·
`AR fails → /identify → same detail view`.
