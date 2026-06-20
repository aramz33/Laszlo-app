# `identify` — image → artwork_id (AR fallback)

Contract: [ADR 0014](../../../docs/adr/0014-runtime-generation-edge-function.md).
When ViroReact AR fails to recognize a painting, the app sends a camera frame; a vision
model picks which candidate artwork it shows and the app opens the same detail view in a
2D overlay. Vision key stays server-side.

```
POST  multipart/form-data { image: <file>, candidate_ids?: csv|repeated, lang_hint? }
->    { artwork_id, confidence, candidates }
```

No embeddings (out of runtime, post-hackathon): the photo + the candidate list (works
loaded for the room; empty => the trackable set) are sent to the model, which chooses.
Good for a curated set of well-known works. Env: `SCW_BASE_URL`, `SCW_API_KEY`, optional
`SCW_VISION_MODEL` (default `pixtral-12b-2409`; `holo2-30b-a3b` also available). Limit: 10 MB.

## Testing

**Unit (no network):**

```bash
deno test supabase/functions/identify/
```

**Local server + curl** (uses a real flagship image so the match is real):

```bash
export SUPABASE_URL=$(grep -E '^SUPABASE_URL=' .env | cut -d= -f2-)
export SUPABASE_ANON_KEY=$(grep -oE 'sb_publishable_[A-Za-z0-9_]+' .env | head -1)
export SCW_BASE_URL=$(grep -E '^SCW_BASE_URL=' .env | cut -d= -f2-)
export SCW_API_KEY=$(grep -E '^SCW_API_KEY=' .env | cut -d= -f2-)
deno run --allow-net --allow-env supabase/functions/identify/index.ts   # :8000
```

```bash
NW=5bc0dc80-bb3d-40d9-825e-9260e1dff6dc   # The Night Watch
MK=efb80c0a-3e96-476a-893d-d10d6ea56620   # The Milkmaid
curl -s "https://spbrkgoseabpsxzkkyzj.supabase.co/storage/v1/object/public/artworks/ref/SK-C-5.jpg" -o /tmp/nw.jpg
# expect artwork_id = $NW ; missing image -> HTTP 400
curl -s localhost:8000 -F image=@/tmp/nw.jpg -F "candidate_ids=$NW,$MK"
```

**Deployed:**
`https://spbrkgoseabpsxzkkyzj.supabase.co/functions/v1/identify`, add
`-H "Authorization: Bearer $SUPABASE_ANON_KEY"`.
