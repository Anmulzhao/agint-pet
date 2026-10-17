# Agent Note: The 2026-10-17 pet intake round

Status: implemented

## Problem

One submission (#15, deep-chan) was open with three gates to clear at once: user-visible evidence, third-party character provenance, and an aesthetic judgement on the real assets. Its required check sat on `action_required` because the contributor is a first-time contributor from a fork, so no green run existed for the head even though the code was ready.

## Decision

**#15 merged as `314a8346`** (deep-chan). Evidence: `docs/pr-evidence/deep-chan-pr-15/desktop.png` shows the settings Pet selector on deep-chan with the pet rendered in the window corner. Provenance: `THIRD_PARTY_NOTICES.md` records the non-official fan rework of the DeepSeek whale character, personal non-commercial use only, and explicitly outside this repository's MIT licence; `pet.json` carries `license: Personal-Use-Only`; both READMEs list the source. Aesthetics and mechanics were checked against the atlas rather than the description: 2048x2592 as 8x9 cells of 256x288, 57 unique frames, no edge bleed on any cell, `running-left` an exact mirror of `running-right`, the standing baseline at row 283, clean alpha on light and dark backgrounds, and `valid: deep-chan (renderer sprite2d)` from `scripts/dsh-pet.cjs`. The pending run was approved, the required check then passed, and the merge followed.

Two observations went to the author without blocking the merge: idle holds a constant frame contour, so the motion amplitude is small at 115px, and the nine tracks are evidenced by one static screenshot rather than a recorded state switch.

## Alternatives considered

Holding for a recorded state switch was rejected: the template asks for a screenshot or a video, a capture that shows both the selector and the live render satisfies it, and the motion evidence already ships as the per-track previews.

## Consequences

The pet reaches the market only when the dsh-web pin moves to this commit and `market/dist` is rebuilt, because `market-inputs.lock.json` maps the pet input to `assets/` in this repository.
