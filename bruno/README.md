# Laszlo runtime — Bruno collection

API tests for the Supabase edge functions ([Bruno](https://www.usebruno.com/),
file-based, git-friendly). Covers the whole backend: `generate/` (the 4 modes
plus varied value sets — languages, profiles, steering, placed point, history,
multi-hotspot, error cases), `transcribe/`, `identify/`, `speak/`. Reuse the
structure for new endpoints.

## Use it

1. Bruno app → **Open Collection** → pick this `bruno/` folder.
2. Top-right, choose an **environment**:
   - **Deployed** — hits the live functions. Works out of the box (the
     `anon_key` here is the public publishable key).
   - **Local** — hits a function you run yourself with `deno run` on `:8000`
     (see `supabase/functions/generate/README.md`). `anon_key` can stay empty.
3. Open a request under `generate/` and **Send**. Each request has `assert`s, so
   a green run = it works.

Headless (CI / quick check), no app needed:

```bash
npx @usebruno/cli run generate --env Deployed
```

## Shared variables

Defined per environment (`environments/*.bru`): `base_url`, `anon_key`,
`artwork_id`, `hotspot_id`. Test data = flagship "The Night Watch" (SK-C-5).
Change them in one place.

## Add the next endpoint

Copy `generate/` to a new folder and adjust — the wiring stays identical:

1. `mkdir bruno/transcribe`, copy a `.bru` in as a template.
2. Set `url: {{base_url}}/transcribe` (the path is just the function name).
3. JSON body → keep `body: json`. **File upload** (`/transcribe`, `/identify`) →
   use `body: multipartForm` with a `file` field instead of `body:json`.
4. Keep the `Authorization: Bearer {{anon_key}}` header (deployed functions need
   it).
5. Add `assert` lines for the expected status / response shape.

No new environment needed — `base_url` already points at `…/functions/v1`.
