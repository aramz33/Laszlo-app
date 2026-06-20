# Backend playbook — read this first

Everything you need to run, test, deploy and continue the Laszlo runtime
**without help**. For _how the code works_ see
[`functions/README.md`](functions/README.md) (overview) + each function's own
README. For _the contract_ see
[ADR 0014](../docs/adr/0014-runtime-generation-edge-function.md).

---

## 1. Where you are

4 edge functions, all **live and deployed**, all tested.

| Function     | Does                                                            | Provider               | State              |
| ------------ | --------------------------------------------------------------- | ---------------------- | ------------------ |
| `generate`   | text: `hotspot` (batch) · `ask` (SSE) · `persona` · `followups` | Scaleway LLM           | ✅ real            |
| `transcribe` | speech → text                                                   | Scaleway Voxtral       | ✅ real            |
| `identify`   | photo → artwork_id (AR fallback)                                | Scaleway Pixtral       | ✅ real            |
| `speak`      | text → audio_url                                                | ⚠️ **keyless stopgap** | ✅ works, swap TTS |

Live base: `https://spbrkgoseabpsxzkkyzj.supabase.co/functions/v1/<name>` (needs
header `Authorization: Bearer <publishable key>`).

---

## 2. Daily commands (copy-paste, from repo root)

```bash
deno test supabase/functions/                 # unit tests (offline, no flags)
deno check supabase/functions/*/index.ts      # typecheck
cd bruno && npx @usebruno/cli run --env Deployed   # full HTTP pipeline (14 reqs)

./supabase/deploy.sh                # deploy all 4 functions
./supabase/deploy.sh generate       # deploy one

# run ONE function locally on :8000 (path-agnostic), then curl it:
export SUPABASE_URL=$(grep -E '^SUPABASE_URL=' .env | cut -d= -f2-)
export SUPABASE_ANON_KEY=$(grep -oE 'sb_publishable_[A-Za-z0-9_]+' .env | head -1)
export SCW_BASE_URL=$(grep -E '^SCW_BASE_URL=' .env | cut -d= -f2-)
export SCW_API_KEY=$(grep -E '^SCW_API_KEY=' .env | cut -d= -f2-)
export SUPABASE_SERVICE_ROLE_KEY=$(grep -E '^SUPABASE_KEY=' .env | cut -d= -f2-)   # speak only
deno run --allow-net --allow-env supabase/functions/generate/index.ts
```

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
| `SUPABASE_ACCESS_TOKEN`              | deploy                       | `sbp_…` personal token — **never commit**                      |
| publishable key (`sb_publishable_…`) | calling the API              | public; lives in a comment + `bruno/environments/Deployed.bru` |

Deployed functions get `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` injected automatically. Provider keys are set once
as secrets (see `deploy.sh` footer).

---

## 5. Open work — prioritized, with exact steps

### A. Swap the TTS to ElevenLabs (when the key arrives) — biggest win

1. Add `ELEVENLABS_API_KEY=...` to `.env`, then set it as a secret:
   `supabase secrets set --project-ref spbrkgoseabpsxzkkyzj ELEVENLABS_API_KEY=...`
2. In **`functions/speak/index.ts`**, replace the body of
   `synthesize(text, lang)` with an ElevenLabs call returning MP3 bytes. Nothing
   else changes — the upload/return path and the contract stay identical.
   (Optionally map `voice`/`speed`/`tone`, which the stopgap ignores.)
3. `./supabase/deploy.sh speak` and re-run the Bruno `speak` request.

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
| One endpoint's details + test recipe    | `supabase/functions/<name>/README.md`                               |
| Pure logic (prompts, parsing, chunking) | `supabase/functions/<name>/lib.ts`                                  |
| HTTP plumbing / orchestration           | `supabase/functions/<name>/index.ts`                                |
| LLM client (Scaleway)                   | `supabase/functions/generate/llm.ts`                                |
| Shared CORS + Supabase clients          | `supabase/functions/_shared/`                                       |
| HTTP test pipeline (varied inputs)      | `bruno/` (open in Bruno app or `npx @usebruno/cli`)                 |
| Deploy                                  | `supabase/deploy.sh`                                                |
| Bigger picture (stack, decisions)       | `docs/STACK.md`, `docs/adr/`, `docs/megathon/0 — TODO directeur.md` |
