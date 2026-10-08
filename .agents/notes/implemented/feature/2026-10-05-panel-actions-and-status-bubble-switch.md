# Agent Note: Panel action extension points and a status-bubble switch (issue #6)

Status: implemented

Related: [the announcement-bubble contract](../../../.agents/notes/implemented/feature/2026-08-29-pet-announcement-bubble.md)
in the dsh-web monorepo (the note that declared the contract plugin-facing and
without a built-in publisher). This note covers the two surfaces that contract
left open: a plugin could push a bubble but could not own one alone, and it had
no place to put a button of its own in the pet's hover panel.

## Problem

A sibling plugin that drives the pet through `pet.announce` could not finish the
job. Two things were only reachable by patching the build output:

1. **The panel action row was closed.** `PetSprite` rendered exactly the fixed
   built-in actions (`feed` / `rename` / `hide`, plus the optional gameplay
   entry), and the voice pack could only relabel or hide them — the action ids
   come from a closed enum. A plugin whose action is "cycle to the next pet"
   had to inject a row into `lib/client.js` and re-apply the patch on every
   upgrade.
2. **The pet's own bubbles had no off switch.** The session bubble stack and
   the legacy single status bubble rendered unconditionally. The `Config`
   schema had no bubble field, and an empty `voice.json` pool is read as "no
   override" (`pool !== undefined && pool.length > 0`), so a voice pack cannot
   silence them. A plugin pushing quota bubbles therefore stacks them beside the
   pet's own, and the user cannot turn the pet's off.

Both are host-authoritative surfaces (the action row and the bubble stack are
rendered by the pet from its own state), so the fix belongs to the pet, not to
the consumers.

## Decision

**An in-process registry, and a mode field the browser half renders against.**

- **Panel actions.** `PetService.registerPanelAction({ id, label, title?,
  order?, onSelect })` registers one action into the hover panel's action row.
  Validation and the bounded table live in the pure module
  `src/panel-actions.ts` (`MAX_PANEL_ACTIONS` = 8); the state view serves the
  registrations as `panelActions`, and the browser half renders one button per
  entry after the built-in ones. A click travels back through
  `POST /api/pet/panel-action`, which dispatches to the registering plugin's own
  callback. The pet owns the row and the plugin owns the button.
- **The bubble switch.** A new settings field `statusBubbles`
  (`'auto' | 'off'`, default `'auto'`, i.e. exactly what shipped before it
  existed) reaches the state view, and `PetSprite` gates only the pet's own
  bubbles on it. The interaction feedback bubble and a plugin's announcement
  bubble keep rendering, and the snapshot still carries the bubble facts either
  way — only the rendering is gated, so switching back on restores them without
  a poll of stale data.

### Why the click travels through HTTP

The browser half holds no plugin callbacks: it is the pet's own component tree
inside one `document.body` root, and a sibling plugin's action is a host-side
function (`onSelect` runs where the plugin applied). Rendering therefore reads
from the existing poll (`panelActions` rides `/api/pet/state`, so a mount or
disposal appears within one tick with no new endpoint) while the click reports
through one small POST that carries the same loopback / paired-device guard as
the rest of the `/api/pet/*` family. The announce contract was deliberately
kept off HTTP; this differs because it is not new data but a reply on the wire
the browser half already uses.

### Why `'auto' | 'off'` and not a boolean

A boolean would make every future mode a schema migration, and `auto` is a
real value rather than "unset" — it is what a document that predates the field
must keep doing. Anything that is not `'off'` normalizes to `'auto'`, so a
hand-edited or older settings document cannot silently lose the pet's bubbles.

## Alternatives considered

- **Custom action ids declared in `pet.json`, dispatched as service events.**
  Rejected. It would make the click depend on a third party having installed the
  pet's manifest vocabulary, and it splits one action into two files
  (`pet.json` plus a host-side listener) where the plugin already owns a
  register call at its own apply.
- **A slots-based action list** (`pet.panelAction` list slot), mirroring
  `ctx.slots`. Rejected for the same reason the announcement contract avoided a
  slot: a single-row control with an ordered, bounded set of buttons does not
  need slot lifecycle and ordering questions, and the pet keeps authority over
  its own chrome. It stays open the same way the announce slot did — if several
  independent surfaces ever need ordering, a slot can be layered on.
- **Letting a plugin hide the pet's bubbles itself** (e.g. the plugin decides
  not to announce while sessions are busy). Rejected: the built-in copy is the
  pet's own, and the user asked for a switch, not for every publisher to
  reimplement the suppression policy. The plugin may still choose *not* to
  announce; the switch is the other half.
- **Making the empty voice pool mean "mute".** Rejected. The pool check
  (`pool.length > 0`) exists so a partial pack does not erase the built-in
  pools it does not mention; turning "empty" into "mute" would make every
  partial pack silence the pet.
- **Persisting the switch in `pet.json`.** Rejected. It is a plugin-level
  rendering preference with no per-pet meaning, exactly like
  `decorationEnabled`, and the settings document is the one place the Host
  serves and mirrors it.

## Consequences

- A third-party plugin can add a panel button and own the pet's bubble surface
  without touching `lib/client.js` or the pet's manifest.
- The default is unchanged in every respect: no registration renders no button,
  and `'auto'` renders exactly the bubbles that shipped. Both are asserted
  rather than assumed.
- Failures stay the plugin's: a malformed registration throws at the registering
  plugin's own apply (a click could not be dispatched back to it), a throwing
  callback and a click on an action that has been disposed both answer
  `{ ok: false, ... }` instead of surfacing as pet breakage.
- Wire change (additive): `PetStateView` gains optional `panelActions` and a
  `statusBubbles` mode; `/api/pet/panel-action` is new. A client half that
  predates both ignores the fields; a host that predates them serves no mode,
  which reads as `'auto'`.
- Tests: `src/panel-actions.test.ts` (validation, id-wins replacement,
  disposer-reclaim, the superseded-disposer trap, bounds, callback failures),
  `tests/panel-actions.spec.ts` (service + route dispatch, the settings switch
  reaching the state view, unknown-mode fallback), client mount assertions in
  `src/client/PetSprite.test.tsx` (row order, click id, tooltip, both bubble
  modes, announcement and feedback bubbles surviving `'off'`) and
  `src/client/PetSettingsCard.test.tsx` (the switch writes `off`, an
  unaccepted draft blocks the save).
