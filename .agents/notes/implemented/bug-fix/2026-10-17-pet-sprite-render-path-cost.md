# Agent Note: the sprite render path stays on whole pixels and wakes only on frame boundaries

Status: implemented

## Problem

Issue #17: with the built-in `whale-girl-refined` pet (a 1536x1872 VP8L atlas,
about 11 MB once decoded) at `display.size: 160`, the whole GUI dropped frames
while the pet was on screen, and hiding the pet restored it. Four independent
costs rode the same surface, and a fifth suspicion turned out not to apply.

1. **Sub-pixel frame offsets on a very large background.** `spriteScale` is
   `display.size / cell.height`, so a 192x208 cell renders at 147.69 x 160 px.
   `background-position` was `-col * cell.width * scale`, i.e. -147.69 px steps,
   and `background-size` was 1181.5 x 1440 px. Every frame change therefore
   landed on a fractional pixel boundary, and the compositor had no cheap
   whole-pixel translate for it: it re-filtered the scaled atlas instead. The
   idle track changes frame every 500-600 ms, so that resample ran continuously
   for a surface the size of the pet.

2. **A permanently mounted `backdrop-filter`.** `.bubbleStatus` (blur 8px) and
   `.bubbleUsage` (blur 8px) are rendered whenever the pet speaks, and `.panel`
   (blur 10px) on hover. A blurred fixed layer forces the region behind it to
   re-composite whenever anything in it changes, so the sprite's own frame
   changes paid for the blur, and the blur itself moves to the CPU path under
   software compositing and power saving. All three surfaces sit on 90-97%
   opaque backgrounds, where the blur is not perceptible.

3. **A 60 Hz loop that almost never changed a frame.** The frame loop re-armed
   itself with `requestAnimationFrame` every screen refresh while track
   durations are 300-700 ms, so roughly 95% of its ticks only re-proved that the
   frame had not changed. `StatusOrnament` in the same file already scheduled by
   the remaining frame time for exactly this reason; the sprite never followed.

4. **A per-frame React render while roaming.** `bus.walk` interpolated the creep
   position with `setDragPos(next)` on every animation frame for 1-3 s at a
   time. Each of those 60-180 renders rebuilt the whole sprite tree — bubble
   stack, dock panel, announcement bubbles — to express a position the DOM
   already knew.

The fifth item in the issue (the 2 s poll rebuilding state objects) needed no
change: `setSnapshot` already skips an unchanged payload through
`sameSnapshot` (`pet-store.ts`), and the registry list is fetched once and held
by identity, so `definition` / `tracks` / `sequences` never change identity on a
poll and the atlas-load and frame-loop effects never restart. The issue also
asked to "keep the visibilitychange pause"; the sprite loop never had one — a
hidden tab simply received no `requestAnimationFrame` callback.

## Decision

- **Quantize the scaled cell, then multiply** (`spritesheet.ts`):
  `scaledCellSize(cell, scale)` rounds the cell once (148 x 160 at the reported
  settings) and `framePosition` returns `-col * scaled.width` /
  `-row * scaled.height`. `background-size` is built from the same helper, so the
  atlas grid, the frame offsets and the sprite box share one pixel grid. The
  rendered atlas is 0.2% wider (1184 px instead of 1181.5 px) and every frame is
  now an exact multiple of a whole pixel; the source art is still resampled once
  when it is scaled, which is unavoidable, but no longer *again* on every frame.
- **Remove `backdrop-filter` from all three floating surfaces**, with the
  measured opacities recorded in the stylesheet. This is the "semi-transparent
  solid colour" option from the issue; a degrade switch was not added because
  the filter contributes nothing visible at 90%+ opacity, so there is no
  appearance to switch back to.
- **Sleep to the next frame boundary** (`PetSprite.tsx` and `sequences.ts`). The
  single-track branch schedules `setTimeout(tick, duration - elapsed)`; the
  sequence branch asks the timeline for `remainingAt(elapsed)`, which reuses the
  same table walk as `frameAt`. A late wake still catches up every due frame, so
  a throttled or janky tab keeps the track's own clock. A non-looping track that
  reaches its last frame stops scheduling entirely — the host owns the switch to
  the track's fallback, so re-painting the same frame forever was pure waste.
- **Repaint the settled frame on a scale change** (`paintedRef`). A stopped loop
  is woken by nothing, so a `display.size` change would otherwise leave the old
  scale's cell offsets on screen and show a neighbouring cell. A layout effect
  repaints the frame the loop stopped on at the new scale.
- **Write the creep position to the element** (`bus.walk`): the step writes
  `float.style.right/bottom` and mirrors the value in `walkTargetRef`, and React
  state is updated once, on the landing frame. `pos` reads the ref first, so a
  render that lands mid-walk (a poll, a hover) renders the position the sprite is
  actually at, and a drag that grabs the pet mid-walk starts from there.

## Alternatives considered

- **Render at an integer multiple and use `image-rendering: pixelated`.** Removes
  the resample entirely, but it changes the art: 160 px is not a whole multiple
  of a 208 px cell, and the only nearby integer options (208 px or 104 px) jump
  the pet's size by 30-50% for every installed pet.
- **Pre-generate a separate small image per track at build time.** Effective, but
  it turns every pet's content pipeline into a build step and multiplies the
  shipped asset count; the whole-pixel grid gets the same compositor path for
  free at any `display.size`.
- **Round the offsets per frame instead of the cell** (`Math.round(-col * 147.69)`,
  the issue's literal suggestion). Keeps the fractional cell size, so offsets
  would be -148, -295, -443, ... — a 1 px drift against a cell that is really
  147.69 px wide, i.e. torn frames at the right edge. Quantizing the cell and
  then multiplying keeps every frame exact.
- **Keep `requestAnimationFrame` and throttle inside it.** Still wakes the main
  thread 60 times a second to decide not to do anything; the timer removes the
  wake instead of shortening it.
- **Blur only while hovered.** The hover panel is the least visible offender
  (95-97% opaque) and the status bubble is the permanent one, so gating on hover
  would have kept the blur exactly where it cost the most.
- **A user-facing degrade switch for the blur.** A setting is a contract the
  maintainer has to keep; with no visible difference to degrade there is nothing
  to opt out of.

## Consequences

- The sprite leaves the 60 Hz wake path: with `idle` at 500/500/600 ms it wakes
  under twice a second instead of 60 times, and a pet settled on `failed` or
  `jumping` wakes not at all until the host switches the track.
- Roaming no longer renders React at all until the walk lands; the landing frame
  is the only state update of a walk.
- The status and announcement bubbles have no backdrop blur. Their glass
  gradients and borders are unchanged, and at 90-95% opacity the difference is
  not perceptible on either theme.
- A hidden tab now wakes the frame loop about once a second (browser timer
  throttling) instead of never, because a timer is not suppressed by
  visibility. The work per wake is a few arithmetic operations and at most one
  style write, and it keeps the track close to wall-clock time when the tab
  returns; no visibility listener was added because the cost is now this small
  and the extra state would only add a way to get the resume path wrong.
- Tests: `src/client/spritesheet.test.ts` covers the quantization (whole-pixel
  multiples at a scale that does not divide the cell, the 1 px floor),
  `sequences.test.ts` covers `remainingAt` including the loop wrap,
  `PetSprite.test.tsx` asserts the whole-pixel atlas size, that no
  `requestAnimationFrame` drives the frame loop, that a settled track stops
  scheduling, that a scale change repaints the settled frame, and that a walk
  writes its position to the element without re-rendering until it lands, and
  `pet-css.test.ts` keeps `backdrop-filter` off the stylesheet.
