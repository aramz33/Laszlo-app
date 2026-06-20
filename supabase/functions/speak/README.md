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

## ⚠ Stopgap provider

ElevenLabs (the intended TTS, ADR 0014) needs a key we don't have yet. Until
then `speak` uses the **keyless Google Translate TTS**: it chunks the text,
fetches each MP3, concatenates them, uploads to the public `artworks/tts/`
Storage path, and returns the URL.

Ceilings: robotic voice, ignores `voice`/`speed`/`tone`, rate-limited, no SSML.
When `ELEVENLABS_API_KEY` is added, replace `synthesize()` in `index.ts` — the
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
