# Agent Note: The 2026-10-13 pet intake round

Status: implemented

## Problem

Three pull requests were open and all three are held: #13 (the `jyn-q` built-in
pet plus the `display.physics` bounce behavior), #15 (`deep-chan`, a pixel
whale-maid pet) and #16 (`jyn-loli`, a frames2d whale girl). #13 came out of the
2026-10-12 round held on material gates; those items are now resolved, and this
round's blockers are engineering, CI and user-visible evidence problems instead.
A pet is delivered as artwork and behavior at once, so a green build is not the
whole gate.

## Decision

**All three are held; none merges this round.**

- **#13 is held on a reproducible pointer defect.** With `display.physics` on,
  pressing and releasing on the pet in place - a `pointerdown` followed by a
  `pointerup` with no `pointermove` between them - leaves the pet hanging in
  mid-air permanently, while the head-pat feedback still fires. The mechanism is
  visible in the diff: `onPointerDown` calls `stopPhysics()` when physics is on,
  and the restart lives only in `onPointerUp` behind `if (landed === null) return`
  in the drag branch, so a click that never moved never hands the body back to the
  integrator. The feature is otherwise sound - `physics` defaults to `false`
  through the schema, the form defaults and persistence, and the change keeps
  every file inside this repository - which is why the defect is reported rather
  than the design. Two description problems accompany it: the pull request body
  and README claim the default 160 px display height is "1:1 on 2x screens", while
  the frame cell the same README declares is 430 px tall for 320 px of content, so
  a 160 px display lands the content at about 119 px, roughly 0.74x and not 1:1;
  and `pet-physics.test.ts`'s "landing speed decays by e" case asserts a value the
  test computes itself, so the bounce's decay is not covered by it. The
  `PetSprite` layer carries no test at all. The previous round's four items pass:
  the provenance record, 144 frames with no two byte-identical (the count moved
  from the earlier 148 as the duplicate frames were removed), and the itinerary
  recomputed from the manifest.
- **#15 is held on a failing gate.** Adding `assets/deep-chan/` leaves the
  built-in pet list in `src/registry.test.ts` incomplete: the expected array at
  that test (line 324) lists ten ids and has no `deep-chan`, so CI fails with one
  failed test (the round reproduced 1 failed / 619 passed, and `assets/` on main
  carries no `deep-chan` directory). That list is the contract for what the
  package ships, not an incidental fixture. Beyond the failure, the round asks for
  the interface screenshots to be committed with the pull request, since they
  exist only on the fork's `evidence` branch, and for the pet to be registered in
  the README's built-in pet table (`README.md:248-254` records the origin of every
  other built-in pet), without which a reader cannot see or place it.
- **#16 is held on user-visible evidence.** The asset contract, the 720-frame
  consistency check, the provenance record and the gates all pass. What is missing
  is a screenshot of the running GUI with this pet selected in the settings
  picker: the ten `previews/` GIFs are animations rendered from the submitted
  frames, so they show that the frames decode and nothing about the pet appearing
  in the product. The same README table (`README.md:248-254`) also has no
  `jyn-loli` row, which leaves the upstream notices statement about this pet
  unfulfilled.

## Alternatives considered

- **Merging #13 because CI is green and the previous round's blockers are
  cleared.** CI drives the schema, the form and the unit layer; it never presses
  and releases on the pet without moving the pointer, which is how the defect
  reached a green run. The freeze is a permanent visual break that a user reaches
  with one ordinary click, and reporting it costs one comment instead of a
  follow-up release.
- **Splitting #13 so the physics behavior merges and only the assets wait.** The
  material half now passes, so a split would be maintainer surgery on a
  contributor's branch to keep a feature whose own pointer path is defective; the
  defect and the feature ship together in this pull request.
- **Letting the "1:1 on 2x" line stand as cosmetic.** It is the sentence a user
  reads before choosing the pet, and the same pull request's own cell dimensions
  contradict it.
- **Merging #16 on the strength of the ten preview GIFs.** They are rendered from
  the committed frames, so they cannot show the picker row; the evidence
  requirement exists because a catalog reader installs a pet they have seen
  running in the product.
- **Closing the three under the one-week stall rule used for community
  registrations.** That rule lives in dsh-community-plugins and has no counterpart
  here; all three authors pushed recently, each pull request carries a written
  blocker, and there is nothing to close or reopen.

## Consequences

- No pet enters the catalog this round, so no dsh-web pin and no `market/dist`
  rebuild follows for these pull requests.
- `display.physics` still ships with nothing, because it arrives inside #13.
- Reusable findings: a behavior reachable only through a pointer pair without
  movement is invisible to a unit suite and has to be exercised by hand; a test
  asserting a value it computes itself from the same constants proves nothing; and
  a preview render derived from the submitted frames is not evidence that the pet
  is selectable in the product.
- Provenance of this note's numbers: the pointer path in the pull request diff,
  the frame-cell arithmetic from the pull request's own README text, and the test
  and README file contents were re-read in this worktree. The suite run, the
  frame-by-frame comparison and the GUI checks are the round's measurements; this
  worktree carries no `node_modules`, so they were not reproduced here.
