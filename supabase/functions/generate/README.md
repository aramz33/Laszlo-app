# `generate` — Laszlo text runtime

Contract:
[ADR 0014](../../../docs/adr/0014-runtime-generation-edge-function.md). Four
modes on one endpoint: `hotspot` (batch JSON), `ask` (SSE), `persona` (JSON),
`followups` (JSON). Grounding (notices) is re-read server-side.

Real LLM via Scaleway (OpenAI-compatible, see `llm.ts`). Each mode falls back to
a deterministic stub if the model call fails, so a demo never shows a blank.
Env: `SCW_BASE_URL`, `SCW_API_KEY`, optional `SCW_MODEL` (default
`mistral-small-3.2-24b-instruct-2506`).

## Testing

Three layers, fastest first.

### 1. Unit tests — pure helpers, no network

Covers grounding/prompt/parse logic in `lib.ts` (response shapes, follow-up
parsing, notice capping). Run from the repo root:

```bash
deno test supabase/functions/generate/
```

Expected: `ok | N passed`. These run in CI-style isolation — no Supabase, no
LLM.

### 2. Local server + curl — full path against real Supabase + LLM

Load the secrets the function needs (Supabase read + Scaleway LLM), then run it.
`--allow-net` lets it reach Supabase/Scaleway, `--allow-env` lets it read the
keys:

```bash
export SUPABASE_URL=$(grep -E '^SUPABASE_URL=' .env | cut -d= -f2-)
export SUPABASE_ANON_KEY=$(grep -oE 'sb_publishable_[A-Za-z0-9_]+' .env | head -1)
export SCW_BASE_URL=$(grep -E '^SCW_BASE_URL=' .env | cut -d= -f2-)
export SCW_API_KEY=$(grep -E '^SCW_API_KEY=' .env | cut -d= -f2-)
deno run --allow-net --allow-env supabase/functions/generate/index.ts   # leave running on :8000
```

In another shell — one call per mode (flagship "The Night Watch", SK-C-5):

```bash
AID=5bc0dc80-bb3d-40d9-825e-9260e1dff6dc      # artwork_id
HID=e2d7f12c-82f7-4d58-9a4a-63da0d1f68ee      # one hotspot id

# persona  -> { persona_summary: "..." }  (no artwork needed)
curl -s localhost:8000 -d '{"mode":"persona","lang":"fr","onboarding":{"allure":"court","niveau":"amateur","interets":["technique"]}}'

# hotspot  -> items[0].status="ready", grounded text, 4 sources
curl -s localhost:8000 -d "{\"mode\":\"hotspot\",\"artwork_id\":\"$AID\",\"hotspot_ids\":[\"$HID\"],\"lang\":\"fr\",\"profile\":{\"niveau\":\"decouverte\",\"interets\":[\"technique\"]}}" | python3 -m json.tool

# ask      -> SSE: a run of {"type":"delta"} then one {"type":"done", text, sources}
curl -sN localhost:8000 -d "{\"mode\":\"ask\",\"artwork_id\":\"$AID\",\"question\":\"Why is the light so dramatic?\",\"lang\":\"en\"}"

# followups -> { questions: ["...","...","..."] }
curl -s localhost:8000 -d "{\"mode\":\"followups\",\"artwork_id\":\"$AID\",\"lang\":\"fr\"}"

# error case -> HTTP 400 {"message":"artwork_id is required"}
curl -s -o /dev/null -w "%{http_code}\n" localhost:8000 -d '{"mode":"ask","question":"x"}'
```

**Healthy signals**

- `hotspot`: `status:"ready"`, a populated `sources` array (proves the server
  re-read Supabase), and grounded prose in the requested `lang`.
- `ask`: `delta` events stream in, then a final `done` with the full `text` +
  `sources`.
- A `[stub ...]` answer or a raw seed text = the LLM call failed and the
  fallback kicked in → check the `SCW_*` env vars.
- Switching `lang` (`fr`/`en`/`nl`) changes the output language;
  `profile`/`steering` visibly change tone/length.

### 3. Deployed — same thing, real URL (what the app calls)

```bash
supabase functions deploy generate     # secrets via: supabase secrets set SCW_API_KEY=...
```

Then the curls above, but against
`https://<project-ref>.supabase.co/functions/v1/generate` and with
`-H "Authorization: Bearer $SUPABASE_ANON_KEY"` (deployed functions require the
anon key).
