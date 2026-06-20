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

## Engines — selectable

Pick per request with `provider`, or set a default with the `TTS_PROVIDER` env.
The response includes `engine` = which one actually produced the audio. `"auto"`
(default) = elevenlabs → edge → google. An explicit choice still falls back to
edge→google so a demo never blanks.

| `provider`    | Engine                                          | Reliability | Notes                                                                                                        |
| ------------- | ----------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `elevenlabs`  | ElevenLabs eleven_multilingual_v2               | ✅ stable   | needs `ELEVENLABS_API_KEY`; **best quality**, native FR/NL/EN; voice = `ELEVENLABS_VOICE_ID` env            |
| `edge`        | Microsoft Edge neural (`edgetts.ts`)            | ⚠️ flaky    | keyless, native FR/NL/EN, honors `speed`; throttles/blocks unpredictably → falls back to google             |
| `mistral`     | Mistral voxtral-mini-tts (`mistraltts.ts`)      | ✅ stable   | needs `MISTRAL_API_KEY`; **English voices only** for now                                                     |
| `google`      | Google Translate TTS (`lib.ts`)                 | ✅ stable   | robotic, all langs, the safety net                                                                           |
| `auto`        | elevenlabs → edge → google                      | —           | default; elevenlabs fast-fails if key missing, rest of chain takes over                                      |

All engines upload the MP3 to the public `artworks/tts/` path and return its URL.
`voice`/`tone` request fields are not yet mapped (ponytail).

Env: `ELEVENLABS_API_KEY` (required for elevenlabs), `ELEVENLABS_VOICE_ID`
(default `EXAVITQu4vr4xnSDxMaL`), `ELEVENLABS_MODEL` (default
`eleven_multilingual_v2`), `MISTRAL_API_KEY` (mistral), optional `TTS_PROVIDER`,
`MISTRAL_TTS_VOICE` (default `en_paul_neutral`), `MISTRAL_TTS_MODEL` (default
`voxtral-mini-tts-2603`).

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

curl -s localhost:8000 -d '{"text":"Bonjour depuis Laszlo.","lang":"fr","provider":"auto"}'
# -> { audio_url, format:"mp3", duration_s:null } ; open audio_url to hear it
# empty text -> HTTP 400
```

**Deployed:** `https://spbrkgoseabpsxzkkyzj.supabase.co/functions/v1/speak`, add
`-H "Authorization: Bearer $SUPABASE_ANON_KEY"`.
