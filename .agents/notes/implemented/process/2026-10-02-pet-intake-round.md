# Agent Note: The 2026-10-02 pet intake round

Status: implemented

## Problem

The 2026-10-02 round reviewed the three open pet submissions that the
2026-10-01 round had all held on the same single blocker, runtime evidence:
#3 (mei-chi-bao), #4 (long-niang) and #5 (jyn-foxtail). Each author answered
with a recording, so the question for this round was whether the delivered
evidence actually proves the intake gate, and, for #3, whether the artwork is
distinct from what the catalog already ships.

## Decision

**#5 (jyn-foxtail) and #4 (long-niang) are merged. #3 (mei-chi-bao) was
withdrawn by its author as a duplicate, not merged.**

**#5 (jyn-foxtail): merged as `2bf9ecb9`.** The attached recording shows the
pet selected in the settings selector and its thirteen tracks playing in the
running GUI, and the frames shown match this pull request's frame set (325
webp files), which is the artifact the gate asks for. The manifest, the 13
tracks and the registry bookkeeping had already passed `dsh-pet validate` and
CI; MIT with the author's own character is the correct declaration for needing
no `THIRD_PARTY_NOTICES` entry.

**#4 (long-niang): merged as `697c0dec` after a resolved conflict.** The
recording proves the selector row ("龙娘") and the animation states. The
sprite2d form carries no gameplay tracks, which is not a missing item: the
catalog's other sprite2d pets are the same shape. Merging #5 first made #4
conflict, because both append to the same alphabetised pet-id list in
`src/registry.test.ts`. Both intents are additive declarations of one new id
plus its assertions, so the resolution keeps `jyn-foxtail` and `long-niang`
in the list (alphabetical order preserved) and keeps both assertion blocks; the
stale comment naming only "jyn and jyn-foxtail" was updated to name both new
pets. Verified with the repository's own `registry.test.ts` (46 passed) and
`dsh-pet validate` for both directories, then pushed to the contributor's
branch and merged with the catalog gate green on the rebased head.

**#3 (mei-chi-bao): withdrawn by the author as a duplicate.** The runtime
evidence is now present and sufficient, and the manifest validates; the blocker
was the character. A frame-by-frame aligned comparison of this pull request's
`spritesheet.webp` against the repository's `assets/whale-refined` showed the
same 192x208 chibi whale-girl - same hair colour, lace headband with fin-like
side ornaments, whale-marked white apron, and the same action sequence and
frame counts. The mean per-pixel difference on aligned frames sits in the
48-63/255 band, clearly below the difference against an unrelated pet
(long-niang), so it reads as another generation or recolour of the same
character. The contributor accepted the comparison, confirmed both share the
`溟月` character prototype (上善无形, second design by ZipZipPipe), and
**closed the pull request themselves on 2026-10-02** rather than resubmitting:
the catalog already carries `whale-girl`, `whale-girl-refined` and
`whale-maid`. The close is the author's, so this round neither merged nor
closed it; the reviewer comment was left for the record.

## Alternatives considered

- **Treating the recordings as insufficient because they are screencasts
  rather than committed artifacts.** Rejected. The gate asks for evidence that
  the pet installs, is selectable and animates in the running plugin; a
  recording of the live GUI window shows exactly that, and the frames on screen
  match the pull request's own frame files.
- **Requiring #4/#3 to add gameplay tracks to match #5.** Rejected. The catalog
  has two pet forms in active use - sprite2d atlases and frames2d gameplay pets
  - and both are accepted submissions; #4's and #3's form is the first.
- **Merging #3 alongside #4.** Rejected. #4's and #3's declarations and
  evidence are equally complete, but #3's artwork does not add a distinct
  character to the catalog, and the same reasoning must not be applied
  unevenly across the two. The author reached the same conclusion and withdrew
  the submission instead.

## Consequences

- Two pets are published; the third was withdrawn by its author after the
  duplicate finding, so the round ends with no open pet submission.
- The round leaves a reusable check for future submissions: an aligned
  per-frame comparison against the shipped catalog is a cheap way to catch a
  near-duplicate before it is listed.
- `src/registry.test.ts`'s pet-id list is now a shared append point for
  concurrent submissions, so future rounds should expect this exact conflict
  and resolve it by keeping both ids.
