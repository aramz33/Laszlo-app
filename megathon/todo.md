# Megathon — App ↔ Backend full connection tracker

> Focused tracker for the sprint goal: **the mobile app (`app-mobile/`) leverages
> Siffrein's backend fully and is connected end-to-end.**
> Broad project board stays canonical in `docs/megathon/0 — TODO directeur.md`;
> this file is the follow-up checklist for the connection effort.
>
> Last update: 2026-06-20 (Devin session).

## TL;DR — where we actually are

- **Backend (Siffrein): DONE & deployed.** 4 edge functions on Supabase
  `spbrkgoseabpsxzkkyzj`: `generate` (modes `overview`/`hotspot`/`ask`/`persona`/`followups`),
  `speak` (TTS), `transcribe` (STT), `identify` (vision). 86 offline tests + Bruno e2e.
  Contract: `supabase/functions/API.md` + ADR 0014.
- **App on `main` before this sprint: 0% connected to the runtime.** It only read
  `artwork`+`hotspot` from PostgREST and rendered raw `narration_text` (violates
  guardrail A1 — the app must show *generated* text, not the notice substrate).
- **Root cause:** parallel agent branches each built a slice but were merged into
  stacked base branches, **never into `main`**. Three divergent app efforts existed:
  - `devin/…-wire-speak-audio` (PR #9): data + `generate` (hotspot/ask/persona/followups) + `speak` + design system + language pill. *Most cohesive.*
  - `feat/mobile-painting-canvas` (PR #1, open): zoomable canvas + runtime client incl. `transcribe` + `identify`.
  - `devin/…-implement-flow-map` (PR #4, draft): full onboarding/persona/navigation UX, but on **mock** data, **not** backend-wired.

## Decision — next sprint step

**Converge the divergent app branches onto `main` into one app that exercises the
whole backend**, instead of opening more parallel feature branches (which is what
caused the divergence). Base = the cohesive `wire-speak-audio` stack; then add the
missing backend surfaces (`transcribe`, `identify`) and persona/profile injection.

## Checklist

### Foundation — landed in this sprint's convergence branch
- [x] Merge `wire-speak-audio` stack onto a convergence branch off `main` (clean merge, typecheck passes).
- [x] Supabase data layer: `fetchArtworks()` reads `artwork?select=*,artist,museum,hotspot` (offline sample fallback).
- [x] Design system (theme + Newsreader/JetBrains Mono) applied across screens.
- [x] Language pill → drives `lang` for every `/generate` + `/speak` call.
- [x] `/generate mode=hotspot` batch on artwork open (`useHotspotTexts`) + 3 s seed-text fallback.
- [x] `/generate mode=ask` SSE chat (`useChat` via XHR streaming) — free question / hotspot context.
- [x] `/generate mode=followups` suggested questions in chat panel.
- [x] `/generate mode=persona` client function (`generatePersona`).
- [x] `/speak` TTS playback per hotspot (`useAudioPlayer`, expo-av) with play/pause.

### Gaps to close for "fully connected" (this sprint)
- [x] **Onboarding (3 questions + lang) → `mode=persona` → AsyncStorage → inject `profile` into every call.** `OnboardingScreen` builds the profile once on first launch (`profile.ts`); `App.tsx` loads it and passes `profile` to the detail screen, so hotspot/ask/followups/overview are all personalized.
- [x] **Voice input `/transcribe`**: mic button in `ChatPanel` records (expo-av, `useVoiceInput`) → multipart upload → text → fed into `mode=ask`.
- [x] **`mode=overview`** virtual "✦ the artwork" card (`useOverview`) shown by default on open, with its own TTS play button.
- [~] **AR fallback `/identify`**: **intentionally not wired (ponytail).** The existing manual picker already recovers when AR tracking misses, so no `expo-image-picker` dep / capture screen was added. `ponytail:` note in `runtime.ts` marks the wire-in point if real photo-recognition is wanted later.
- [x] Typecheck (`cd app-mobile && npm run typecheck`) green.
- [ ] PR opened against `main`; CI green.

### Verification / demo
- [x] Live smoke test (curl, anon key) against deployed functions: `generate` overview/hotspot/persona/followups + `speak` all return real grounded FR output (`speak` returns a real `.mp3` url).
- [ ] On-device happy-path with `EXPO_PUBLIC_SUPABASE_*` set (needs a dev-client build — ViroReact + expo-av).
- [ ] Happy-path walkthrough recorded (open artwork → hotspots personalize → listen → ask → switch lang).
- [ ] QR / manual selection fallback verified (same detail view + runtime contract).

### Out of scope this sprint (tracked on the directeur board)
- [ ] `location` schema column for per-room loading (A3) — flagships hardcoded for demo.
- [ ] Trim flagship Wikipedia notices (D3) — improves `ask` grounding quality.
- [ ] Mollie payment edge function (last).
- [ ] Zoomable painting canvas (from `feat/mobile-painting-canvas`) — nice-to-have polish.

## Notes / decisions
- Onboarding built **contract-accurate** (`allure`/`niveau`/`interets`/`free_text`)
  rather than porting flow-map's divergent persona model (`stroll`/`curious`/…),
  to keep one source of truth matching `API.md`.
- Convergence done sequentially on one branch (no new parallel branches) to avoid
  re-creating the divergence that left `main` unconnected.
- **Ponytail pass (2026-06-20):** code written lazy-senior-dev style — only what the
  task needs, no avoidable dependency, deletion over addition, safety never cut.
  `/identify` capture UI + `expo-image-picker` dep were dropped because the manual
  picker already covers the AR-miss case (rung 1/4). Unused `clearStoredProfile` and
  a single-use `buildProfile` helper were removed/inlined. 5 of 6 backend surfaces
  wired; `/identify` is the deliberate omission, flagged for Adam.
- Net result: **app went from 0% → fully connected on 5 of Siffrein's 6 surfaces**
  (`generate` ×5 modes + `speak` + `transcribe`).
