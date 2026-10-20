# Agent Note: The 2026-10-20 plugin review round

Status: implemented

## Problem

The gameplay-layer submission (#20) is the first change in a while to touch the sprite render path rather than add a pet asset: 32 files, all under `src/`, `contracts/`, `tests/` and `.agents/`, so the pet content intake gates do not apply and the review is ordinary plugin review. Its sixth item adds a pixel-size snap, which overlaps the whole-pixel render path the 2026-10-17 note established for issue #17.

## Decision

**#20 is held on one behavioural defect.** `src/service.ts:1091` applies `pixelSafeSize` to `next.size` on every `setConfig` call, and dragging the pet sends a position-only patch (`src/client/index.ts:575-576`). Because the rendered height is `display.size` (`src/client/PetSprite.tsx:376`, default 160 in `src/persist.ts:74`), a drag re-snaps the size against the sprite cell: with the four bundled frames2d packs that turns 160 into 512 for miku (cell 1024), 342 for jyn (683), 311 for jyn-foxtail (621) and 283 for doro (566). The fix is to snap only when the patch carries `size`.

**The hint copy does not describe any bundled pack.** `src/client/locales.ts:79` and `:169` promise 128 / 192 / 256, which only holds for a 256px cell and none of the four packs uses one, so the hint should state fractions of the cell height instead.

**It has to align with the 2026-10-17 render-path note rather than duplicate it.** `345325f` already quantises the scaled cell in `src/client/spritesheet.ts` for issue #17, and item 6 solves the same sub-pixel problem a second way. The branch is 21 commits behind main, so the review asks for a rebase before the mechanism is settled.

The rest verifies: merging current main gives typecheck 0 and 52 files / 700 tests passing, `node scripts/dsh-pet.cjs validate` reports the four frames2d and six sprite2d packs valid, and `tests/gameplay-block.spec.ts` adds 32 cases. The workflow run needed a maintainer approval before the required check could report at all.

## Alternatives considered

Merging the snap as shipped and correcting it in a follow-up was rejected: dragging is the pet's most common interaction, so the defect would ship as the first thing users meet.

Accepting the submission's own validation as compatibility evidence was rejected: it validates a contributor-private pack that cannot be reproduced here, while the four bundled packs are the evidence that decides it.

## Consequences

The sprite path carries two competing quantisation mechanisms until the author rebases, and this note is the record that keeps them from being merged as independent answers. No pet pin moves, because the change is plugin code and the market reads only `assets/` from this repository.
