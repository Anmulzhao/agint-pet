# Agent Note: frames2d decoded frames are retained under a byte budget instead of for the life of the page

Status: implemented

## Problem

The frames2d canvas path memoized every decoded frame forever. Its decode cache
was a `Map<url, Promise<DecodedFrame>>` whose only pruning was the failure path,
so a frame that ever played stayed resident until the renderer was disposed:

```ts
job.then((frame) => { if (frame === undefined) decoding.delete(url) }, () => decoding.delete(url))
```

Nothing released a successfully decoded bitmap, and the only place that closed
one was `dispose()`. A parallel `decodedAll: Promise<void>[]` collected one
settled promise per decode job and was likewise only read at dispose, so it grew
with the session too.

This was bounded only by the number of distinct frame URLs a pet can ever play —
which is content, not a limit. It grows monotonically as the pet cycles through
its tracks (gameplay phases, click actions, skin switches) and only resets when
the plugin disposes.

Measured on a shipped three-skin `frames2d` pet installed at
`$DSH_HOME/pets/<id>`: 19 track directories holding 1276 frames, every frame
512x683 (a decoded RGBA frame is 1.33 MB), so the unbounded memo reached roughly
**1.7 GB**, with about 99 MB of it steady-state from the idle loop alone (74
frames). Track lengths are 21-78 frames each, so the whole defect is cross-track
accumulation, not one oversized track.

This surfaced while attributing a macOS memory alert on a DSH desktop instance;
it is a real unbounded client-side growth path, even though it was not the
process the alert named.

## Decision

Retain decoded frames under a byte budget, releasing least-recently-used frames
that the playing track does not need:

- `MAX_RETAINED_BYTES = 128 MiB`. The budget is in **bytes, not frames**, because
  a frame's footprint is `width * height * 4` and published pets differ by more
  than an order of magnitude (512x683 is 1.33 MB, 128x128 is 64 KB): a frame
  count would be useless for small atlases and too tight for large ones. It caps
  exactly what the defect was about — resident memory — regardless of content.
- The map's insertion order is the LRU order. A cache hit re-inserts the entry,
  and a freshly decoded frame is inserted on arrival, so "recently requested"
  and "recently decoded" both count as use.
- `DecodeEntry` carries `frame` and `bytes` only once a job resolved with a
  frame, so pending and failed jobs are never eviction candidates and a released
  bitmap always has a real `close()` target.
- Eviction runs when the budget is crossed, and it never releases the playing
  track's look-ahead window nor the frame a draw is currently awaiting
  (`pinned`). Releasing either would hand a closed bitmap to `drawImage`, and
  re-decoding the window would stall the next tick.
- Eviction reclaims **other** tracks before the playing one. Under a budget
  smaller than two whole tracks this is what keeps a running loop warm: the pet
  left the previous track behind, so that is what gets reclaimed rather than the
  cycle currently playing. When the protected window alone exceeds the budget
  nothing is released — the overshoot is then exactly one window, and a pet whose
  frames are that large cannot be bounded further without breaking playback.
- The resolution handler also closes a frame that lands after `dispose()`. That
  makes the settle barrier unnecessary, so `decodedAll` is gone entirely: dispose
  releases every retained bitmap and drains the pool synchronously, and nothing
  is left pending or retained afterwards.

`PREFETCH_AHEAD = 12`, the pool limit, the failure-path `decoding.delete`, the
stall watchdog (still skipped under `reducedMotion`), the canvas/`<img>`
capability probe and the skin/override semantics are unchanged.

## Alternatives considered

- **Evict the whole track when it stops playing (track-granular LRU).** Same
  reclamation without per-frame accounting, but it cannot bound a single track
  larger than the budget, which is the one case where a pet can still pin
  hundreds of megabytes. Kept as the *bias* inside the byte budget instead, which
  gets both properties.
- **A frame-count budget (e.g. 96 frames).** Simple, and it happens to fit every
  shipped track (21-78 frames), but it is content-coupled in both directions: it
  under-protects a pet with 4K frames and over-retains one with 64 KB frames. The
  number would have to be re-tuned for each new pet.
- **Evict the playing track's oldest frames when a single track exceeds the
  budget (pure LRU, no protection).** Bounds memory hardest, but a looping track
  larger than the budget would then re-decode on every wrap, converting a memory
  floor into sustained CPU and network churn. Rejected; the window protection
  makes the overshoot one window instead.
- **Cap `decodedAll` instead of removing it.** Treats the symptom: the array was
  only the settle barrier, and guarding the resolution handler on `disposed`
  removes the need for it outright.

## Consequences

- Resident decoded bitmaps are bounded at roughly `MAX_RETAINED_BYTES` plus at
  most one protected window; a full multi-track, multi-skin playthrough no longer
  grows without limit. For the measured pet the ceiling drops from ~1.7 GB to
  about 104 MB for the idle loop (78 frames, which fits the budget in full) and
  to the window size for longer runs.
- "Steady-state playback issues zero re-decodes" now holds for tracks that fit
  the budget. A pet whose single track exceeds 128 MiB re-decodes the frames
  outside the current window when the loop wraps; that is the deliberate price of
  the bound, and it is the only behavior regression.
- Switching between two tracks whose combined frames exceed the budget drops the
  idle track's bitmaps, so the next switch back re-decodes that track. Tracks in
  this repository (21-78 frames) stay under the budget individually.
- Tests added in `src/client/renderers/frames2d.test.ts`: cache hit across a whole
  loop, release plus re-decode after eviction, a multi-track run that stops
  growing, and full release on dispose. Each asserts on real `close()` calls of
  the decoded frames, so a future change that only unmaps entries without
  releasing bitmaps fails them.
