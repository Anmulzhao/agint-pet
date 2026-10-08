# Agent Note: One announcement slot per publishing plugin (issue #1812)

Status: implemented

Related: [2026-10-05-panel-actions-and-status-bubble-switch](2026-10-05-panel-actions-and-status-bubble-switch.md)
sits next to this one on the same surface (the hover panel and its bubble
stack); the announcement contract itself was designed in the dsh-web monorepo
(see its `.agents/notes/implemented/feature/2026-08-29-pet-announcement-bubble.md`).

## Problem

The `pet.announce` contract held exactly one announcement. `PetService` kept a
single `announcement` field and every publish overwrote it, so as soon as a
second third-party plugin started announcing, the two displaced each other: the
user saw bubbles flicker or one publisher permanently starving the other.

This was not an oversight but a deferred decision. The contract's own note
recorded the limit and the intended upgrade: "One announcement slot means a
second announcing plugin would displace the first's bubble; if that happens,
promote to a keyed map or a slot before stacking hacks." The 2026-09-17
decoupling removed the only built-in publisher (`dsh-usage`), which emptied the
slot and deferred the question. A third-party publisher then arrived, which is
the moment the note was waiting for.

## Decision

**`source` is the slot key, and the slot table is a bounded map.**

- `PetService` keeps a `Map<source, PetAnnouncement>` instead of one field.
  `announce()` validates as before, then writes only the caller's own slot;
  every publisher keeps its own TTL, and expiry is per slot.
- The state view serves `announcements` (every fresh slot, in render order) and
  **also keeps the singular `announcement` field**, carrying the freshest entry.
  That field keeps exactly the meaning it had when the contract had one slot,
  so a browser half predating the array renders one bubble instead of none. A
  rolling upgrade must never blank a publisher, and the browser half is
  self-contained (its own bundle, no server-rendered HTML), so this is the only
  pairing needed.
- The browser half renders one bubble per entry, keyed by `source`, and falls
  back to the singular field when the array is absent (an older host).

### Why `source`, and why insertion order

`source` is already a required, validated, bounded field of the payload and it
names the publishing plugin, which is exactly the slot identity. No new key had
to be invented, so publishers need no change to adopt the upgrade.

Render order is the map's insertion order, and re-announcing a source updates its
entry **in place**. The alternative — sorting by `at` — was rejected: two
publishers on different cadences would swap vertical positions every poll, which
reads as flicker. A repeating publisher refreshing its own row is the calm
behaviour users can read at a glance.

### Why a bound, and who loses a slot

`MAX_ANNOUNCEMENTS` is 4. The bubble stack is a finite column, and the bound
exists so a publisher that rotates `source` per bubble cannot grow it without
limit. 4 is above the realistic publisher count (quota, balance, notification)
and below what would crowd out the session bubbles.

Eviction follows two rules, in order: a lapsed publisher's slot frees itself
(an idle publisher never holds capacity), and a genuinely full table hands its
oldest slot to the arriving publisher. "Oldest" is the least recently announced
entry, ties broken by insertion order — so a publisher that keeps refreshing is
never the one evicted, and a newcomer is never silently dropped.

## Alternatives considered

- **Leave the single slot and document the displacement.** Rejected as the
  primary answer: the contract was explicitly designed for sibling plugins and
  has no built-in publisher to coordinate with, so "publishers coordinate among
  themselves" has no owner. The documentation now describes the multi-publisher
  behaviour, which is what makes the upgrade reviewable.
- **A slots-based bubble list** (`pet.bubble`), the general shape the announce
  note also deferred. Rejected for now: it would pull slot lifecycle and ordering
  questions into a surface whose second consumer is two or three publishers, and
  the pet still owns the chrome. It remains the escalation if publishers need
  publisher-defined rendering, which this contract deliberately does not allow.
- **A priority or `kind`-based conflict policy** (one bubble wins). Rejected:
  it makes publishers coordinate on a contract they do not own, which is the
  problem the reporter came with.
- **Numbered or capped slots per `source`.** Rejected: one bubble per publisher
  already matches what a publisher means by announcing, and a second bubble
  would need its own layout and its own interaction.

## Consequences

- Two or more announcing plugins coexist; neither displaces the other, and each
  expires on its own TTL.
- A wire change (additive): `PetStateView.announcements` is new and
  `announcement` keeps its previous meaning. No publisher-facing call changes:
  `ctx.pet.announce(payload)` is the same, which is what lets the reporter adopt
  the upgrade without a rewrite.
- The slot table is in-memory and dies with the service fiber, like the single
  slot it replaces.
- Tests: `tests/announce-service.spec.ts` (coexistence, per-publisher TTLs,
  in-place refresh without reordering, the bound with the eviction rule, a
  lapsed slot freeing itself, and no slice served when nothing is published) and
  mount assertions in `src/client/PetSprite.test.tsx` (one bubble per publisher,
  served order above the session bubbles, the singular-field fallback for an
  older host, per-entry TTL between polls, and feedback still taking the stack).
