# Agent Note: jyn-loli as a frames2d pet

Status: implemented

## Problem

A tenth pet joins the repository on the 鲸鱼娘 (whale girl) character line that
`assets/jyn` and `assets/jyn-foxtail` already occupy: **jyn-loli**, 10 tracks and
720 frames produced with MiniMax H3 (fl2va image-to-video) rather than by
transforming a still. Two of its decisions are not visible in the files themselves
and a maintainer may reasonably revisit both.

1. **Ten tracks have to share one cell, and the cell's HEIGHT is the only
   dimension that costs anything.** The host scales a frames2d pet by frame
   height, so growing the shared crop box taller shrinks every track at once,
   while growing it wider is free. The work trio carries the largest props (a
   heaped bowl, a ballooning belly, a rainbow), and the question was whether they
   force the box open.
2. **The gameplay blocks are written conditionally, and one condition was
   wrong.** `clickBoost` — the per-click stat nudge — is only legal INSIDE the
   `touch` block (a top-level `gameplay.clickBoost` is rejected as an unknown
   field), and `touch` had been gated on the three shy animation tracks, which this
   package does not ship. Gating the whole block dropped the click boost with it.

## Decision

- **One shared 764x1172 cell, height growth 0 px against the six-track build, so
  every track renders at 100% of the character size.** The work trio's content
  union sits entirely inside the union of the standing tracks, so the props never
  push the box open; the left edge is owned by the dance track (x0 = 8), not by
  the work art. Verified before the 25-minute repack with a predictor that reuses
  the packer's own `key_frame` / `despeckle` / `symmetric_crop` helpers.
- **Uniform 72 frames x 40 ms = 2880 ms on all ten tracks**, rather than the maid
  pet's 25 x 120 ms for its one-shots. One cadence across the package keeps every
  track's duration equal, which is the invariant `tests/jyn-loli-pet.spec.ts`
  asserts; the work result tracks therefore run 120 ms SHORTER than the manifest's
  `resultMs` and the host holds their last frame for that remainder.
- **`touch` ships, with the shy tracks absent: the branches lose their `state`
  and keep their `effects` and phrases.** A touch branch's `state` is optional —
  `assets/doro` ships zones with no state at all — so the "missing shy tracks"
  condition called for stripping the dangling references, not dropping the block.
  `clickBoost` is gated on the stats block instead, because a zone's `effects`
  may only name a declared stat.
- **Repo-only, not a built-in pet.** 84 MB (70.4 MB of frames, 13.6 MB of preview
  GIFs) sits with jyn (113.9 MB), doro (55.5 MB) and jyn-foxtail (14.9 MB), none of
  which are in the `package.json` `files` whitelist; only the 5.6 MB jyn-q is.

## Alternatives considered

- **Trimming the cell by redrawing the props smaller.** Rejected: the measured
  union already fits inside the existing box, so there was nothing to buy.
- **Matching the maid pet's 25 frames x 120 ms on the three work tracks** so a
  result track equals `resultMs` exactly. Rejected: it breaks the one-cadence
  invariant for a 120 ms static tail on a frame that is byte-identical to the
  next track's first frame — invisible, and the spec now pins the real invariant
  (`beat < resultMs`) instead of asserting a fiction.
- **Skipping the whole `touch` block because the shy animations are missing.**
  Rejected — that is exactly the bug above: the host then answers a tap with
  `{"ok":false,"error":"no-touch"}` and the pet is the only frames2d pet in the
  set whose clicks feed nothing.
- **Re-encoding the frames smaller to shrink the payload.** Rejected: at 98 KB per
  764x1172 frame the package is *lighter per megapixel* than jyn (71 KB per
  512x683), so the size is a resolution choice, not an encoding waste.

## Consequences

- Clicking the pet now reaches a stat (`mood` +0..3) on the same terms as jyn,
  jyn-foxtail, jyn-q and doro. The inherited `legs` zone still carries jyn's 63%
  chance of affection -5 ("哼！讨厌！") — that balance was authored, not invented here.
- The work result tracks hold their last frame for 120 ms of the 3000 ms window.
- The pet is reachable by cloning the repository, not by installing the npm
  package; adding `"assets/jyn-loli"` to `files` is the one-line switch.
- The source illustration carries no PNG text chunk, so
  `THIRD_PARTY_NOTICES.md` records the generator as the author's statement rather
  than as file metadata — unlike the Jyn-Q entry, which could cite a TC260 label.
