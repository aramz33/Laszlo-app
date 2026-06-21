# Laszlo runtime — Supabase edge functions

> 🧭 Operational first-read (run / test / deploy / what's next / FAQ):
> **[../PLAYBOOK.md](../PLAYBOOK.md)**. 📱 Calling these from the app?
> **[API.md](API.md)**. Resuming the lane?
> **[../../docs/HANDOFF-Siffrein.md](../../docs/HANDOFF-Siffrein.md)**.

The server side of Laszlo: four Deno/TypeScript edge functions. The app talks to
them over HTTPS; all provider keys (LLM / STT / TTS / vision) stay here, never
in the app. Grounding is always re-read server-side — the client sends ids,
never facts. Full contract:
**[ADR 0014](../../docs/adr/0014-runtime-generation-edge-function.md)**.

```
app ──► /generate   text     5 modes: overview · hotspot · ask · persona · followups
app ──► /transcribe audio    speech → text   (STT)
app ──► /identify   image    photo → artwork_id, AR fallback   (vision)
app ──► /speak      text     text → playable audio_url   (TTS)
        every function ──► Supabase (read notices/hotspots) and/or a provider
```

## How a request flows

1. App POSTs JSON (or multipart for audio/image) with the **anon key** in
   `Authorization`.
2. The function reads its grounding from Supabase with the **anon client**
   (public-read tables), builds a provider call, and returns the contract shape.
3. `/generate mode=ask` streams Server-Sent Events (`delta` then `done`);
   everything else returns final JSON. `/speak` writes the MP3 to Storage with
   the **service-role client** and returns its public URL.

## Layout

```
_shared/http.ts       CORS, preflight(), jsonResponse()       — used by all 4
_shared/supabase.ts   anonClient() (reads) · serviceClient() (writes)
generate/  index.ts · prompts.ts (system+mode prompts, templated) · lib.ts (grounding/stubs, pure) · llm.ts (Scaleway chat) · stub_test.ts
transcribe/ identify/ speak/   index.ts · lib.ts (pure) · stub_test.ts · README.md
```

Each function: `index.ts` = HTTP + orchestration; `lib.ts` = pure, unit-tested
helpers (prompt building, parsing, chunking); `stub_test.ts` = `deno test` for
those helpers. Per-function detail lives in each folder's `README.md`.

## Providers (swap by env, ADR 0012)

| Concern           | Provider                    | Env (default)                                                                      |
| ----------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| LLM (generate)    | Scaleway, OpenAI-compatible | `SCW_BASE_URL`, `SCW_API_KEY`, `SCW_MODEL` (`mistral-small-3.2-24b-instruct-2506`) |
| STT (transcribe)  | Scaleway                    | `SCW_STT_MODEL` (`voxtral-small-24b-2507`)                                         |
| Vision (identify) | Scaleway                    | `SCW_VISION_MODEL` (`pixtral-12b-2409`)                                            |
| TTS (speak)       | ElevenLabs · Edge · Mistral · Google | `ELEVENLABS_API_KEY` (opt-in, best quality); Edge/Google keyless; `TTS_PROVIDER` default |

`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are
auto-injected when deployed; export them locally.

## Test

```bash
deno test supabase/functions/            # all unit tests (pure helpers)
deno check supabase/functions/*/index.ts # typecheck

cd bruno && npx @usebruno/cli run --env Deployed   # full HTTP pipeline vs deployed
```

Local HTTP: run one function with
`deno run --allow-net --allow-env <fn>/index.ts` (serves on `:8000`,
path-agnostic) and point Bruno's **Local** env at it. See each folder's README.

## Deploy

```bash
export SUPABASE_ACCESS_TOKEN=...   # personal access token (sbp_...), kept in .env only
supabase functions deploy <name> --project-ref spbrkgoseabpsxzkkyzj --use-api
# provider keys as function secrets:
supabase secrets set --project-ref spbrkgoseabpsxzkkyzj SCW_BASE_URL=... SCW_API_KEY=...
```
