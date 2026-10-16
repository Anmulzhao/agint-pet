# Agent Note: The 2026-10-16 pet intake round

Status: implemented

## Problem

Three pet pull requests were open: #13 (jyn-q, a frames2d pet plus a bounce
physics mode in the plugin), #15 (deep-chan, a sprite2d pet) and #16 (jyn-loli, a
frames2d pet). All three touch the shipped plugin, so the round had to separate
what a contributor can fix from what the repository has to decide.

## Decision

**Nothing merged.** Each carries a concrete ask:

- **#13** needs the packaging decision reversed and one number corrected. It adds
  `assets/jyn-q` to the `files` whitelist in `package.json`, which would ship a pet
  whose own README calls it an unofficial, personal, non-commercial fan work with
  the npm package. The documented policy in `src/registry.test.ts` is the
  opposite - doro, miku, jyn, jyn-foxtail, long-niang and starry-doll all reach
  users through the Workshop and are excluded there - and CONTRIBUTING allows only
  pets that "are meant to be a built-in default". The ask is to drop that line;
  the `registry.test.ts` expectation stays, because the registry scans `assets/` in
  a repo checkout and removing it would redden the suite. Separately, the README
  table rows, the round note and a test header still claim "1:1 at 2x" after the
  body and the asset README were corrected to a 0.74x downsample.
- **#16** needs its previews fixed. All ten GIFs record the transparent background
  as an opaque checkerboard (every frame's alpha is 255, the corner is
  `(239,237,240)`/`(213,213,221)`), where doro's and whale-refined's previews use
  real transparency, and the `rest` entry track carries an opaque grey ghost for
  about a second. Its contract and provenance work is complete.
- **#15** stays held on the failing required check. The maintainer comment from
  2026-10-13 already names the fix - `'deep-chan'` missing from the expected list
  at `src/registry.test.ts:324`, which the directory scan legitimately produced -
  so this round adds no duplicate comment. The setup screenshot remains a link to
  a fork branch rather than a committed file.
- **#13's** plugin half passed: `pet-physics.ts` imports nothing, the mode defaults
  off, and it restores to the previous position on release.

## Alternatives considered

**Merge #13 and let the whitelist follow-up land separately.** Shipping is the
part that reaches users; correcting it afterwards would publish the package
first and apologise second.

**Merge #16 on the strength of its green checks and complete provenance record.**
The checkerboard previews are what a user sees in the store, and they also
contradict the body's claim that the GIFs are rendered from the committed frames.

**Re-comment on #15.** The blocking analysis is unchanged from 2026-10-13. A second
identical request adds noise without adding information.

## Consequences

No pet reached `main` this round, so the Workshop is unchanged. The repository now
has an explicit ruling on the npm whitelist: a pet with a non-commercial fan-work
declaration ships through the Workshop, not inside the package. Contributor-side
wording that quotes a ratio has to be corrected in every file that carries it,
including the notes and test comments, or the next reader trusts the wrong number.
