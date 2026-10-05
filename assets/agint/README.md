<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2026 anmul -->

# AGINT Pet

The AGINT desktop pet: the letter A with the self-evolution loop woven
through it, one frame track per activity phase.

- License: MIT
- Renderer: `frames2d`
- Cell: 256 × 256, 57 frames, ~305 KB
- Brand source: `DSH-AGINT/docs/assets/brand/agint-brand-icon.svg`

## What this is

The brand mark itself. **Not a redraw, not an approximation.** All 57 frames
are computed from the real geometry in that SVG.

Per the SVG's own `<desc>`: the letter A with the self-evolution loop woven
through it — the loop disappears behind the apex and comes back out in front of
the right stroke.

## The one design decision

**The letter is still. The loop moves.**

A letterform does not bounce, so the A never scales, shifts or rotates in any
of the seven phases. The loop is the part of the mark that carries meaning, so
it carries all the motion — and it does not spin in its own plane, because a
flat ring turning reads as a letter C skidding on glass. It ORBITS: every point
of the loop carries a depth, the near arc rides over the letter at full brand
cyan, and the far arc drops behind the letter and dims (down to 50%). As the
loop turns, the whole depth field travels around the letter and the weave
appears and unappears by itself. Nobody animates the weave; it falls out of
depth. The silhouette never changes — every frame is still the exact brand
circle the shipped icon was built from.

Colour is constant across every phase except `failed`. A brand mark that
recolours on every state is noise; the one state that must be unmistakable
gets the one colour change.

The pet lives on DSH's dark shell, so this uses the brand's onDark pairing: the
A is near-white `#F5F8FC`, the loop is signal cyan `#24D3E5` — the one colour
the brand never flips.

## The seven phases

| Phase | Frames | Each | Reads as |
|---|---|---|---|
| `idle` | 6 | 900ms | Slow 5°/frame. Barely noticeable, but alive. |
| `waiting` | 4 | 700ms | Down to 1.5°, loop at 70%. Waiting. |
| `thinking` | 8 | 200ms | 13°/frame. Clearly working. |
| `tool` | 6 | 130ms | 26°/frame plus a near-white arc striking the leading edge. |
| `review` | 8 | 380ms | Swings ±14° instead of turning. Reviewing scans, it does not race. |
| `done` | 8 | 150ms | 45°/frame and a 3% lift, one hump that starts and ends at rest. |
| `failed` | 4 | 1000ms | Stops. Loop at 0°, dimmed to 85%, sinks 1.5%, fault colours. |

`failed` is the only phase that changes colour: letter to `#8A94A6`, loop to
`#FF5C5C`. Both were picked by measurement against the dark ground — 5.63:1
and 5.69:1 against `#0A1B34`.

## The four skins (system health)

Health is a STATE, not a sentence. A bubble is said once and fades; a skin is
how the pet rests until something changes. So health rides `setSkin`, not
`announce`, and `plugins/agint-mascot` picks one from the verdict.

| Skin | Idle track | Frames | Reads as | Verdict |
|---|---|---|---|---|
| `healthy` | `idle` | 6 | Drifts forward at a steady pace | every source read |
| `degraded` | `idle-degraded` | 6 | Still going forward, but limping: 14/2/18/2/16° steps | a source is unreadable, or the score is low |
| `unknown` | `idle-unknown` | 6 | Swings without ever advancing | nothing could be read (score floored, nothing throwing) |
| `failed` | `idle-failed` | 1 | **One still frame.** Not moving is the message | a source threw |

The three non-fault skins keep the brand palette and differ by MOTION. Only
`failed` changes colour. `unknown` exists so the pet does not lie: "I could
not read anything" and "something is broken" are two different claims, and
only the second one is a fault.

The mapping lives in `skinIdForHealth()`
(`plugins/agint-mascot/lib/announce.js`); the manifest declares the skins in
`pet.json` under `frames2d.skins`. Assertion 9 in `check.mjs` joins the two
ends: every id the plugin can request must be declared by the manifest —
otherwise the host answers `unknown-skin` and the look silently never changes.

## Rebuilding

```sh
cd DSH-AGINT/tools/agint-pet
node build.mjs --verify                            # check the geometry
node build.mjs --out <dir>                         # emit frames
node check.mjs --out <dir> --preview <dir>         # self-check + previews
```

No dependencies, node >= 18.

`--verify` compares the reconstructed geometry against the measured bounds of
the shipped icon (933 × 919, 26.19% ink coverage). A wrong transcription fails.

`check.mjs` asserts things a wrong build would fail: the mark must not touch
the cell edge, frames inside a track must differ, coverage must sit in the
20–33% band, `failed` must carry the fault colour and no other phase may, no
two phases may render identical sequences, and — the one that earns its keep —
**the weave must actually weave**, asserted in both directions: loop-band
pixels painted in the letter colour (the part that passed behind) and letter
pixels covered by the loop (the part that rides in front). The assertion knows
nothing about which sector is in front, so it survives any future change of the
depth model. That last assertion exists because that is exactly how a real bug
got through: the sector test was written to measure from 0°, so the "in front"
arc swallowed the whole ring, the "behind" arc was covered completely, and the
weave vanished while rotation still moved no pixel at all.

## Three channels of state

The character spec requires state to be carried by colour, shape and text
together, because the dark variant's primary and accent sit at only 1.71:1.

| Channel | Owner |
|---|---|
| Motion | this asset (which track plays, how fast) |
| Colour | this asset (`failed` only) |
| Text | the announcement bubble, from the `agint-mascot` plugin |

A stopped, reddened pet whose bubble reads "AGINT 故障：xxx" gives the same
conclusion three different ways.

## Layout

```
pet.json              manifest: frame list and duration per track
frames/<phase>/*.png  57 frames, 256×256, transparent
LICENSE               MIT
README.md / README.zh.md
```

## See also

- Character spec: `DSH-AGINT/docs/brand/agint-character-spec.md`
- Master plan: `docs/AGINT/桌宠方案.md` in `Anmulzhao/agint-pet`
- Upstream contract: `agint-pet/contracts/pet-manifest-v2.schema.json`
- Status source: `DSH-AGINT/plugins/agint-mascot`
