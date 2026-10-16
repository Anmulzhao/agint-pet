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


## Review round: the two frames the reviewer could see (2026-10-16)

The intake review passed the material checks (manifest, 720-frame contract,
provenance, the built-in pet table, CI) and requested changes on three things a
human eye catches and a validator cannot. Two of them were **animation defects in
the shipped frames**, not documentation, and both traced back to a decision made
earlier in the build rather than to the model's own art.

1. **The preview GIFs were not transparent.** `previews/*.gif` went through
   petkit's `_write_gif`, which pre-composites every frame onto an 8px grey
   checkerboard before quantising to a 255-colour palette — so all 7200 preview
   pixels came out with alpha 255 and the top-left read (239,237,240). Every other
   pet's previews in this repository are true-alpha GIFs (doro's `cola.gif`,
   whale-refined's `idle.gif`: alpha range [0,255], corner alpha 0), so the
   package was the odd one out. petkit is shared by three pets and is not this
   PR's to change; the replacement writer (`tools/make_preview_gifs.py`) reserves
   one palette index for transparency, binarises the frame's own alpha at 128 and
   saves with `disposal=2`, and uses FASTOCTREE rather than MEDIANCUT so the
   transparent GIFs come out at the size of the checkerboard ones (idle 1503KB vs
   1404KB) instead of 60% larger. Composited on white, a rebuilt frame now differs
   from the committed frame by a mean of 2.4/255 — the checkerboard build differed
   by 17, which is what made the "these GIFs are rendered from the committed
   frames" claim unverifiable.

2. **the rest entry track carried an opaque grey ghost over f_007..f_032.**
   Root cause, found by rebuilding the track from its source: `derive_resting_v2.py`
   resampled the source's f0..f44 onto 72 frames with **linear interpolation**, and
   the lie-down (f4..f20) moves 18->55 grey levels per frame inside the character
   silhouette. On a pure white backdrop a 34%/66% blend of two such frames does not
   produce a 34% ghost — it dilutes the hair into grey, which is exactly the
   "looks semi-transparent but the alpha is opaque" the review described. A blend
   is only safe where the source itself barely moves, so the rebuild
   (`derive_rest_v3.py`) uses a **motion-adaptive time remap**: f0..f20 at 1:1
   (frame-for-frame, zero blending), a smoothstep ramp to 2.32x over f20.5..f26.5,
   and 2.32x slow motion for the quiet lying segment that follows. Ghost amplitude
   (min(frac,1-frac) x inter-frame motion) falls from 24.8 grey levels at frame 25
   to 2.5 in the whole flagged range, and the track keeps the same first and last
   frames, so the rest->resting seam stays exact.

3. **work-fail's rainbow was six hard-edged flat sectors, and it buried the
   sweater.** That one is the model's own art: seven flat pure colours
   (rgb(208,0,16) / (232,144,16) / (248,248,88) / (88,240,40) / (24,248,248) /
   (0,16,224) / (144,0,208)) covering 87k px at its peak, 71% of them sharing a
   colour with all eight neighbours. It is repaired rather than regenerated
   (ComfyUI is not running, and a re-roll is a different animation): every occluded
   pixel is filled from the nearest frame in which the fan does not cover it
   (100% of the fan's union is recoverable inside f0..f44; median donor distance 5
   frames), and the fan itself is re-rendered as a **feathered, translucent
   overlay** whose colours are the same sectors smoothed by a normalised
   convolution inside the mask. Hard-edge fraction falls to 0.000 and the buried
   sweater detail comes back at 55%.

Alternative considered and rejected: **rolling back to the other work-fail take**
(`work-fail_771623.mp4`, kept in the generation-side logs). Its "fan" mask
matches saturated pixels across the whole 768x1248 canvas and never clears — it is
the rejected take, not a cleaner one.
