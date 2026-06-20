# `speak` — text → playable audio URL

Contract:
[ADR 0014](../../../docs/adr/0014-runtime-generation-edge-function.md).
`/generate` stays text-only; `/speak` turns the final text into audio and
returns a short playable URL (not base64). The app keeps only playback controls;
the TTS key stays server-side.

```
POST  { text, lang, voice?, speed?, tone? }
->    { audio_url, format, duration_s }
```

## Providers (keyless, no ElevenLabs key yet)

1. **Primary — Microsoft Edge neural TTS** (`edgetts.ts`): good quality, many
   voices, no length limit, keyless (WebSocket + a time-based token). Honors
   `speed`.
2. **Fallback — Google Translate TTS** (`lib.ts`): robotic but rock-stable; used
   only if Edge fails. Chunks text (~200 chars) and concatenates.

Both upload the MP3 to the public `artworks/tts/` Storage path and return its
URL. `voice`/`tone` are currently ignored. When `ELEVENLABS_API_KEY` is added,
add an ElevenLabs branch at the top of `synthesize()` in `index.ts` — the
contract and the upload/return path do not change.

Storage write uses `SUPABASE_SERVICE_ROLE_KEY` (auto-injected when deployed;
export it locally to test).

## Testing

```bash
deno test supabase/functions/speak/                # unit (chunking/url)
```

```bash
export SUPABASE_URL=$(grep -E '^SUPABASE_URL=' .env | cut -d= -f2-)
export SUPABASE_SERVICE_ROLE_KEY=$(grep -E '^SUPABASE_KEY=' .env | cut -d= -f2-)
deno run --allow-net --allow-env supabase/functions/speak/index.ts   # :8000

curl -s localhost:8000 -d '{"text":"Bonjour depuis Laszlo.","lang":"fr"}'
# -> { audio_url, format:"mp3", duration_s:null } ; open audio_url to hear it
# empty text -> HTTP 400
```

**Deployed:** `https://spbrkgoseabpsxzkkyzj.supabase.co/functions/v1/speak`, add
`-H "Authorization: Bearer $SUPABASE_ANON_KEY"`.
