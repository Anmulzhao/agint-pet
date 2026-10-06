# Agent Note: The 2026-10-06 plugin review round

Status: implemented

## Problem

This round took the single open pull request in this repository, #11 ("reach the
locale service from the floating surface and keep the voice remark layer"), from a
first-time contributor. It fixes two defects: the floating surface resolved its
copy through a module-local `t` that honoured an `<html lang>` only when it
started with `en`, so every other language fell back to Chinese, and
`applySettingsSection()` passed only `selected.remarks` to
`PetLedger.setRemarks`, dropping the voice-pack layer so the picker fell back to
`BUILTIN_REMARKS`.

Because the pull request came from a fork, its check lane sat in
`action_required` and had never run: only the routing workflow had executed, so
neither the contributor nor a reader had typecheck, test or build evidence.

## Decision

**Merged as `5a48818a` after approving the pending CI run and re-running the gates
locally at head `f1dfa6a5`.**

- Both root causes were confirmed against the base revision before the patch was
  accepted: the base called `setRemarks` with one layer, and the module-local
  dictionary picked `zh` for anything that was not `en`. The patch routes every
  call site (constructor, `setPetId`, `applySettingsSection`) through one
  `remarkLayers` helper and binds `ctx.locale.bind('pet')`, the same seat the
  settings card already resolves through. `bind` returns a per-namespace function
  the SDK caches, with no subscription and no disposer, so the change adds no
  lifecycle obligation.
- Local evidence: `node --test scripts/dsh-pet-migrate-v2.test.mjs
  scripts/dsh-pet.test.mjs` 22/22, `pnpm typecheck` clean, `pnpm test` 619 tests
  across 49 files, `pnpm build` clean. The required check ("migrate script,
  typecheck, test and build") ran green after the run was approved.
- The contributor's own note for the fix
  (`implemented/bug-fix/2026-10-06-pet-locale-seat-and-voice-remark-layers.md`)
  travelled inside the pull request; this note records the maintenance decision.

## Alternatives considered

- **Merging on the contributor's word without local verification.** While its CI
  lane was unapproved the pull request was the only evidence available; running
  the suite locally was cheap and is what the review reported.
- **Holding for a stronger mount assertion.** `src/client/index.test.tsx` asserts
  that the locale seat was bound rather than what the surface rendered, and
  `src/service.test.ts` depends on the default pet carrying no manifest remarks
  and on a zero treat balance. Both are recorded in the review as follow-ups;
  neither lets the two defects reappear.

## Consequences

- Main carries the fix and its regression tests.
- The pet market input is `assets/`, which this change does not touch, so the
  dsh-web submodule pin is deliberately left where it was: the store does not read
  `src/`. The pin and `market/dist` move only for asset changes.
- A browser language with no registered dictionary now renders English rather than
  Chinese, following the framework's `FALLBACK_LOCALE`.
