# `generate` — Laszlo text runtime

Contract:
[ADR 0014](../../../docs/adr/0014-runtime-generation-edge-function.md). Four
modes on one endpoint: `hotspot` (batch JSON), `ask` (SSE), `persona` (JSON),
`followups` (JSON). Grounding (notices) is re-read server-side.

Real LLM via Scaleway (OpenAI-compatible, see `llm.ts`). Each mode falls back to
a deterministic stub if the model call fails, so a demo never shows a blank.
Env: `SCW_BASE_URL`, `SCW_API_KEY`, optional `SCW_MODEL` (default
`mistral-small-3.2-24b-instruct-2506`).

## Verify

**Unit (no network):**

```bash
deno test supabase/functions/generate/
```

**Local server + curl (real grounding):**

```bash
export SUPABASE_URL=$(grep -E '^SUPABASE_URL=' .env | cut -d= -f2-)
export SUPABASE_ANON_KEY=$(grep -oE 'sb_publishable_[A-Za-z0-9_]+' .env | head -1)
export SCW_BASE_URL=$(grep -E '^SCW_BASE_URL=' .env | cut -d= -f2-)
export SCW_API_KEY=$(grep -E '^SCW_API_KEY=' .env | cut -d= -f2-)
deno run --allow-net --allow-env supabase/functions/generate/index.ts   # leave running
```

Another shell (flagship SK-C-5):

```bash
AID=5bc0dc80-bb3d-40d9-825e-9260e1dff6dc
HID=e2d7f12c-82f7-4d58-9a4a-63da0d1f68ee

# hotspot batch -> expect status:"ready" + 4 sources
curl -s localhost:8000 -d "{\"mode\":\"hotspot\",\"artwork_id\":\"$AID\",\"hotspot_ids\":[\"$HID\"]}" | python3 -m json.tool

# ask -> expect a stream of delta events then a done event
curl -sN localhost:8000 -d "{\"mode\":\"ask\",\"artwork_id\":\"$AID\",\"question\":\"Why this light?\"}"
```

Healthy = `status:"ready"`, a populated `sources` array (proves the server
re-read Supabase), and grounded prose in the requested language. A `[stub ...]`
/ seed text means the LLM call failed and the fallback kicked in (check `SCW_*`
env).

**Deployed:** `supabase functions deploy generate`, then call
`https://<ref>.supabase.co/functions/v1/generate` with
`-H "Authorization: Bearer $SUPABASE_ANON_KEY"`.
