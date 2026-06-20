# `transcribe` — speech → text

Contract: [ADR 0014](../../../docs/adr/0014-runtime-generation-edge-function.md).
Forwards an uploaded audio file to the STT provider (Scaleway, Voxtral by default) and
returns plain text. STT key stays server-side. Blocking step before `generate mode=ask`
for voice input.

```
POST  multipart/form-data { audio: <file>, lang_hint?: "fr|en|nl" }
->    { text, lang, duration_s }
```

Env: `SCW_BASE_URL`, `SCW_API_KEY`, optional `SCW_STT_MODEL`
(default `voxtral-small-24b-2507`; `whisper-large-v3` also available). Limits: 10 MB / 20 s.

## Testing

**Unit (no network):**

```bash
deno test supabase/functions/transcribe/
```

**Local server + curl:**

```bash
export SCW_BASE_URL=$(grep -E '^SCW_BASE_URL=' .env | cut -d= -f2-)
export SCW_API_KEY=$(grep -E '^SCW_API_KEY=' .env | cut -d= -f2-)
deno run --allow-net --allow-env supabase/functions/transcribe/index.ts   # :8000
```

```bash
# real speech -> the spoken text; missing audio -> HTTP 400
curl -s localhost:8000 -F audio=@/path/to/speech.wav -F lang_hint=fr
```

A 440 Hz tone (or any non-speech) returns hallucinated text — use a real clip to judge
quality. Healthy wiring = HTTP 200 with `{ text, lang, duration_s }`.

**Deployed:**
`https://spbrkgoseabpsxzkkyzj.supabase.co/functions/v1/transcribe`, add
`-H "Authorization: Bearer $SUPABASE_ANON_KEY"`.
