# Backend playbook — read this first

Everything you need to run, test, deploy and continue the Laszlo runtime
**without help**. For _how the code works_ see
[`functions/README.md`](functions/README.md) (overview) + each function's own
README. For _the contract_ see
[ADR 0014](../docs/adr/0014-runtime-generation-edge-function.md).

---

## 1. Where you are

4 edge functions, all **live and deployed**, all tested.

| Function     | Does                                                            | Provider                            | State                          |
| ------------ | --------------------------------------------------------------- | ----------------------------------- | ------------------------------ |
| `generate`   | text: `overview` · `hotspot` (batch) · `ask` (SSE) · `persona` · `followups` | Scaleway LLM                                    | ✅ real                        |
| `transcribe` | speech → text                                                                 | Scaleway Voxtral                                | ✅ real                        |
| `identify`   | photo → artwork_id (AR fallback)                                              | Scaleway Pixtral                                | ✅ real                        |
| `speak`      | text → audio_url                                                              | **ElevenLabs** (default) · edge · mistral · google | ✅ works (pick via `provider`) |

Live base: `https://spbrkgoseabpsxzkkyzj.supabase.co/functions/v1/<name>` (needs
header `Authorization: Bearer <publishable key>`).

---

## 2. Daily commands (copy-paste, from repo root)

```bash
deno test supabase/functions/                 # unit tests (offline, no flags)
deno check supabase/functions/*/index.ts      # typecheck
cd bruno && npx @usebruno/cli run --env Deployed   # full HTTP pipeline (16 reqs)

./supabase/deploy.sh                # deploy all 4 functions
./supabase/deploy.sh generate       # deploy one

# run ONE function locally on :8000 (path-agnostic), then curl it:
export SUPABASE_URL=$(grep -E '^SUPABASE_URL=' .env | cut -d= -f2-)
export SUPABASE_ANON_KEY=$(grep -oE 'sb_publishable_[A-Za-z0-9_]+' .env | head -1)
export SCW_BASE_URL=$(grep -E '^SCW_BASE_URL=' .env | cut -d= -f2-)
export SCW_API_KEY=$(grep -E '^SCW_API_KEY=' .env | cut -d= -f2-)
export SUPABASE_SERVICE_ROLE_KEY=$(grep -E '^SUPABASE_KEY=' .env | cut -d= -f2-)   # speak only
export MISTRAL_API_KEY=$(grep -E '^MISTRAL_API_KEY=' .env | cut -d= -f2-)          # speak provider=mistral
deno run --allow-net --allow-env supabase/functions/generate/index.ts
```

### Test layout (83 tests, all offline)

- `<fn>/stub_test.ts` — pure helpers in `lib.ts` (prompts, parsing, chunking,
  mapping). Covers: `systemPrompt` (lang/allure/niveau/steering/persona),
  `hotspotPrompt`, `overviewPrompt`, `askPrompt` (with point / hotspot context),
  `followupsPrompt`, `capText`, `buildGrounding`, `candidateLines` (null fields),
  `visionPrompt`, `resolveMatch`, `toTranscript`, `chunkText`, `googleTtsUrl`, etc.
- `<fn>/handler_test.ts` — behavior of the HTTP handler via `handle(req, deps)`:
  a `Request` in, a `Response` out, with the external boundaries (DB / LLM / STT
  / vision / TTS engines / upload) **injected as fakes**. Covers routing,
  validation, every mode, fallbacks, partial failures (mixed hotspot batch, mid-
  stream error → done with partial text), upload failure, response contract shape.
- `bruno/` — real HTTP against the deployed functions (live providers).

To test a new function the same way: extract
`export function handle(req, deps)`, guard the server with
`if (import.meta.main) Deno.serve(...)`, read env lazily (inside calls), then
write `handler_test.ts` passing fake `deps`. No flags, no network.

---

## 3. Tooling (only if the environment resets and `deno`/`supabase` are gone)

```bash
# Deno (no unzip here -> extract with python)
curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip -o /tmp/deno.zip
python3 -m zipfile -e /tmp/deno.zip ~/.deno/bin/ && chmod +x ~/.deno/bin/deno

# Supabase CLI — extract the FULL tarball (it needs its sibling `supabase-go`)
mkdir -p ~/.local/share/supabase
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xzf - -C ~/.local/share/supabase

export PATH="$HOME/.local/share/supabase:$HOME/.deno/bin:$PATH"   # already in ~/.bashrc
```

---

## 4. `.env` keys used (all already present, at repo root, gitignored)

| Key                                  | Used by                      | Note                                                           |
| ------------------------------------ | ---------------------------- | -------------------------------------------------------------- |
| `SUPABASE_URL`                       | all                          | project URL                                                    |
| `SUPABASE_KEY`                       | local `speak`                | this is the **service_role** secret (Storage writes)           |
| `SCW_BASE_URL`, `SCW_API_KEY`        | generate/transcribe/identify | Scaleway                                                       |
| `MISTRAL_API_KEY`                    | `speak` provider=mistral     | Mistral voxtral-mini-tts (English voices only)                 |
| `SUPABASE_ACCESS_TOKEN`              | deploy                       | `sbp_…` personal token — **never commit**                      |
| publishable key (`sb_publishable_…`) | calling the API              | public; lives in a comment + `bruno/environments/Deployed.bru` |

Deployed functions get `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` injected automatically. Provider keys are set once
as secrets (see `deploy.sh` footer).

---

## 5. Open work — prioritized, with exact steps

### A. ~~Swap the TTS to ElevenLabs~~ — ✅ done

ElevenLabs is now the default engine when `ELEVENLABS_API_KEY` is set. Auto
chain: elevenlabs → edge → google. `ELEVENLABS_VOICE_ID` (default
`EXAVITQu4vr4xnSDxMaL`) and `ELEVENLABS_MODEL` (default
`eleven_multilingual_v2`) are configurable via Supabase secrets. The key must be
set as a secret for deployed functions:

```bash
supabase secrets set --project-ref spbrkgoseabpsxzkkyzj ELEVENLABS_API_KEY=...
```

### B. Pick the LLM (M32) — quality/latency

- Default is `mistral-small-3.2-24b-instruct-2506` (env `SCW_MODEL`). Try
  alternatives by exporting `SCW_MODEL=...` locally (e.g.
  `llama-3.3-70b-instruct`, `mistral-medium-3.5-128b`) and comparing
  `generate ask`/`hotspot` on the flagships. List models:
  `curl -s "$SCW_BASE_URL/models" -H "Authorization: Bearer $SCW_API_KEY"`.
- Watch the **Wikipedia notice dump (D3)**: it's raw and large; if `ask`
  grounding is poor, trim those notices (pipeline, Adam) or raise the model.

### C. Mollie (payment) — last, not part of the runtime

- New edge function `mollie` (hosted checkout + webhook → unlock
  `premium_venue`). Separate provider key. Do it after the demo path is solid.

### D. Nice-to-haves

- `speak` `duration_s` is `null` (no MP3 decoding) — fill if the app needs a
  progress bar.
- `identify` ignores `lang_hint`; `generate` ignores per-message
  `history[].artwork_id`. Both are accepted-but-unused, intentional.

---

## 6. FAQ / gotchas

- **`deno: command not found`** → `export PATH="$HOME/.deno/bin:$PATH"` (or
  `source ~/.bashrc`).
- **`401` from the deployed URL** → missing/incorrect
  `Authorization: Bearer <publishable key>`.
- **`ask` text starts with `[stub …]`, or a hotspot returns its raw seed** → the
  LLM call failed and the fallback fired. Check `SCW_API_KEY` / model name.
- **`/speak` 502 locally** → `SUPABASE_SERVICE_ROLE_KEY` not exported (needed
  for Storage upload).
- **Deploy says it needs Docker** → you dropped `--use-api`. Always deploy with
  `--use-api` here.
- **Deploy 401 / "Access token not provided"** → `SUPABASE_ACCESS_TOKEN` not
  exported from `.env`.
- **Why is the local server path-agnostic?** `deno run` serves the handler at
  any path, so `localhost:8000/generate` and `localhost:8000` both work.
  Deployed, the path is `/functions/v1/<name>`.

---

## 7. Where to look for what

| Question                                | File                                                                |
| --------------------------------------- | ------------------------------------------------------------------- |
| Request/response of every endpoint      | `docs/adr/0014-…md` (canonical)                                     |
| How the runtime fits together           | `supabase/functions/README.md`                                      |
| Calling the API from the app            | `supabase/functions/API.md`                                         |
| Resuming this lane from scratch         | `docs/HANDOFF-Siffrein.md`                                          |
| Visual playground (app-like UI)        | `supabase/playground.html` (open in a browser)                          |
| Quick quality check vs deployed         | `./supabase/quality-probe.sh [fr\|en]`                              |
| One endpoint's details + test recipe    | `supabase/functions/<name>/README.md`                               |
| Pure logic (prompts, parsing, chunking) | `supabase/functions/<name>/lib.ts`                                  |
| HTTP plumbing / orchestration           | `supabase/functions/<name>/index.ts`                                |
| LLM client (Scaleway)                   | `supabase/functions/generate/llm.ts`                                |
| Shared CORS + Supabase clients          | `supabase/functions/_shared/`                                       |
| HTTP test pipeline (varied inputs)      | `bruno/` (open in Bruno app or `npx @usebruno/cli`)                 |
| Deploy                                  | `supabase/deploy.sh`                                                |
| Bigger picture (stack, decisions)       | `docs/STACK.md`, `docs/adr/`, `docs/megathon/0 — TODO directeur.md` |
