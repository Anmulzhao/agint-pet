# Agent Note: The 2026-10-12 pet intake round

Status: implemented

## Problem

The single open pull request, #13, does two things at once: it ships a new
built-in pet (`jyn-q`, 148 frames across eight tracks) and it adds a
`display.physics` behavior that lets pets fall and bounce. Because this
repository publishes its assets to every Workshop user, the material side has to
clear the same three gates as any contribution - user-visible evidence, a
provenance record, and the aesthetic check - regardless of who submits it.

## Decision

**Held on the material gates. The plugin-source half is accepted as written.**

- The physics feature is sound and is not the reason for the hold. `physics`
  defaults to `false` through the schema, the form defaults and persistence; the
  client tests `display.physics === true` strictly and hands roaming over when it
  is on. The only `package.json` change is one whitelist line (`assets/jyn-q`), no
  `peerDependencies` moved, and every changed file is inside this repository.
- The frame assets are mechanically correct: eight track directories on disk match
  the manifest, the frame counts total 148 exactly as the spec asserts, indices are
  contiguous with a unique duration suffix per track, and each track has a
  matching preview. All 148 frames are 223x297 with alpha.
- The aesthetic check on the frames themselves passes on craft: no cropping (0 of
  148 frames touch the canvas edge), no distortion, no stray or missing limbs, no
  watermark, clean edges (the soft alpha pixels average RGB (1,1,1) over black,
  which is dark line-art antialiasing rather than a white fringe), and
  frame-to-frame continuity within each state.
- Three material problems hold the pull request:
  1. **No user-visible evidence.** The description and comments contain no
     screenshot and no recording, so nothing shows the pet appearing in the
     settings picker or its states animating. This is the intake gate.
  2. **No provenance record.** `assets/jyn-q/` has no README and no LICENSE, and
     `THIRD_PARTY_NOTICES.md` has no entry for it, while `README.md`'s built-in pet
     table - which lists every other pet's origin - does not mention it and the
     pull request changes no documentation. The `pet.json` `author` field reads
     `11726`, which does not correspond to the contributor credited on the sibling
     `jyn` entry. The repository's own `doro` entry shows the required shape
     (character, work, rights holder, unofficial status, non-commercial use).
  3. **The animation does not match the manifest description.** The eight states
     are affine transforms of one static illustration rather than distinct poses:
     normalized against the idle first frame, whole-state differences run 3.5% to
     13.9%, 25 of the 148 files are md5 duplicates, and four files across three
     different states (`happy/f_000_100`, `done/f_000_100`, `review/f_000_120`,
     `review/f_009_120`) are byte-identical (sha256 `b37e9882…`). The head tilt,
     the typing-like bob and the nodding described in `pet.json` are therefore not
     present in the artwork, and the claim of four phase tracks mapping onto the
     seven phases does not match the manifest's seven-to-seven mapping.
- Two secondary observations were passed on without blocking: at 223x297 the
  frames are the lowest-resolution built-in pet material (against 649x621 for
  `jyn-foxtail`), so they will soften on a 2x display at the 160px default height;
  and the two wallpapers' worth of detail sits behind a character the manifest
  describes as programmatically derived from a single static illustration whose
  origin is unrecorded.

## Alternatives considered

- **Merging because the author is a maintainer's collaborator.** The gates are
  about the change, not the author. The evidence requirement exists because a
  reader deciding whether to install the pet cannot otherwise see it, and the same
  standard was applied to every other pet in the catalog.
- **Merging the physics feature separately from the assets.** Splitting the pull
  request would have been maintainer surgery on a contributor's branch and would
  still leave `assets/jyn-q/` staged for the same three holds; the feature is
  recorded as accepted so it can merge as soon as the material half clears.
- **Accepting the frames as a deliberate low-cost art style.** The craft of the
  frames is fine; the problem is that the manifest describes specific motions that
  are not in the artwork. Correcting the description would also resolve it, so the
  hold asks for either real per-state art or an accurate description.

## Consequences

- The pet does not enter the catalog; `assets/` is the pet market input, so no
  dsh-web pin or `market/dist` change follows from this round for this pull
  request.
- `display.physics` remains unshipped with it, because it arrived in the same pull
  request.
- The round's reusable finding: frame counts, dimensions and directory structure
  can be checked automatically, but "the animation shows what the manifest says it
  shows" cannot, so a pet whose states are transforms of one illustration will
  pass every structural check while still misdescribing itself.
