---
tags: [projet/laszlo, megathon, type/handoff, statut/actif]
date: 2026-06-20
---

# Handoff — lane backend (Siffrein)

> For whoever (human or model) picks up the **server/runtime** lane. Written to
> be resumable cold. Read this, then `supabase/PLAYBOOK.md` (operations) and
> `docs/adr/0014-…md` (the contract). The frontend lane is `docs/HANDOFF.md`
> (Adam).

## Who does what

- **Siffrein = backend / Supabase edge functions** (this lane). Repo `.env` is
  at the root.
- **Adam = mobile app** (Expo RN + ViroReact, `/app-mobile`) + pipeline. He
  consumes the runtime via **`supabase/functions/API.md`**.
- ⚠ Some older docs say the opposite (Aramsis=backend) — they're stale; trust
  this.

## What this lane delivers

The visitor output `output = f(notice, glossaire, profil, langue, voix)` lives
in **4 Supabase edge functions**, all live, deployed, and tested:

| Function     | Role                                                                   | Provider                            |
| ------------ | ---------------------------------------------------------------------- | ----------------------------------- |
| `generate`   | text — modes `hotspot` (batch) · `ask` (SSE) · `persona` · `followups` | Scaleway LLM                        |
| `transcribe` | speech → text                                                          | Scaleway Voxtral                    |
| `identify`   | photo → artwork_id (AR fallback)                                       | Scaleway Pixtral                    |
| `speak`      | text → audio_url                                                       | selectable: edge / mistral / google |

Project ref `spbrkgoseabpsxzkkyzj`. Live base
`…supabase.co/functions/v1/<name>`, needs
`Authorization: Bearer <publishable key>`.

## How it's built (conventions a fresh model must keep)

- **Code is English-only, thoroughly commented.** Docs/Obsidian stay French.
- **Deno/TypeScript.** Each function dir: `index.ts` (HTTP + orchestration,
  exports `handle(req, deps)`), `lib.ts` (pure helpers), `*_test.ts`,
  `README.md`. Shared bits in `_shared/` (CORS/JSON, Supabase clients).
- **Boundaries are injected** via `deps` (DB/LLM/STT/vision/TTS) so handlers
  test offline. `Deno.serve` is guarded by `if (import.meta.main)`. Env is read
  lazily inside calls.
- **Grounding is server-side**: client sends `artwork_id`, never notices.
  Mono-call LLM, no tools — deliberate security boundary (ADR 0014 §security).
- **Every mode has a fallback** (stub text / engine chain) so a demo never
  blanks.
- Providers are config (`SCW_*`, `MISTRAL_API_KEY`, `TTS_PROVIDER`) → swappable,
  ADR 0012.

## State: done ✅

- 4 functions implemented, deployed, e2e-verified.
- 45 offline unit/behavior tests (`deno test supabase/functions/`).
- Bruno HTTP pipeline, 16 requests / 27 assertions vs deployed (`bruno/`).
- Docs: `PLAYBOOK.md` (ops), `functions/README.md` (overview), per-function
  READMEs, `functions/API.md` (client guide for Adam), `deploy.sh`.

## What's next (priority order — details in PLAYBOOK §5)

1. **ElevenLabs TTS** when the key lands — optional quality upgrade; add an
   engine to `speak`'s `ENGINES`/`realDeps`. (Edge is keyless but Microsoft
   throttles it.)
2. **Pick the LLM (M32)** — eval `SCW_MODEL` candidates on the flagships; trim
   the raw Wikipedia notices (D3) if `ask` grounding is weak (pipeline = Adam).
3. **Mollie** payment edge function — last, not part of the runtime.
4. Nice-to-haves: `speak.duration_s`, use `identify` `lang_hint`.

## Resume checklist (cold start)

1. `export PATH="$HOME/.local/share/supabase:$HOME/.deno/bin:$PATH"` (PLAYBOOK
   §3 to reinstall).
2. `deno test supabase/functions/` → expect 45 passed.
3. `cd bruno && npx @usebruno/cli run --env Deployed` → expect all pass.
4. Change code → `deno test` + `deno check` → `./supabase/deploy.sh <name>` →
   re-run Bruno.
5. Commit/push (repo on `main`, remote = Adam's `aramz33/Laszlo-app` via the
   `github` SSH alias).

## Gotchas

See PLAYBOOK §6 (deno PATH, 401, `[stub]` text = LLM fell back, `/speak` 502 =
service-role env, deploy needs `--use-api`, Mistral content-filters profanity →
engine falls back).
