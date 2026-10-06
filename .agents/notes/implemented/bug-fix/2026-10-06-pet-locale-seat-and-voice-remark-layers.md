# Agent Note: The floating pet resolves copy through the locale seat, and every remark re-seat keeps the voice layer

Status: implemented

## Problem

A language pack could not reach the pet, for two independent reasons.

**The floating surface never entered the locale service.** `apply()` mounted
`PetDockEntry` with the module-local `t` from `src/client/locales.ts`, and that
function picks its dictionary by `document.documentElement.lang`:

```ts
return lang.toLowerCase().startsWith('en') ? en : zh
```

Only `en` was distinguished, so every other registered language rendered
Chinese. With `lang="ru"` the hover panel, the summon button, the rank and stat
rows and the gameplay HUD were Chinese while the settings card next to them was
translated — the card is slot-injected and receives the framework `t` seat. The
plugin already resolves its settings section label through `ctx.locale.bind(NS)`,
so the two surfaces disagreed about the same namespace.

**The settings path dropped the voice-pack layer.** The ledger's remark pools are
two layers: the manifest's own `remarks` and the voice packs (a pet directory's
`voice.json` over the global `$DSH_HOME/pets/.voice.json`).
`PetLedger.setRemarks(remarks, voiceRemarks)` takes both, and two of the three
call sites passed both — the constructor and `setPetId()`. `applySettingsSection()`
passed only `selected.remarks`, so `RemarkPicker` fell back to
`BUILTIN_REMARKS`. The settings surface applies a committed section on every
change, so the drop happened immediately after startup and stayed: a pet whose
lines a voice pack had translated answered from the built-in pools again while
its status and whisper bubbles — resolved from the voice pack at draw time —
stayed translated.

## Decision

- Mount the dock entry with the framework seat: `t: ctx.locale.bind(NS)`, and
  drop the now-unused local `t` import. The 'pet' namespace then follows the
  active language, the English fallback, and every language pack that registers a
  dictionary for it.
- Resolve the remark layers in one place. `PetService.remarkLayers(entry)`
  returns `{ remarks, voiceRemarks }`; the constructor spreads it into
  `LedgerConfig`, and one private `applyRemarks(entry)` re-seats the ledger from
  it. Both RPC paths (`setPetId`, `applySettingsSection`) call `applyRemarks`, so
  no call site can seat the manifest layer alone.

## Alternatives considered

- **Let the floating surface read `<html lang>` itself.** Rejected: duplicates
  the locale service, keeps every language pack out, and cannot fall back per key
  (a partial dictionary would print keys).
- **Carry the pet's copy in the manifest instead of the locale service.**
  Rejected: adding a language must not require touching the plugin, which is what
  the locale service exists for.
- **Change `PetLedger.setRemarks` to take one layers object** so a partial call
  cannot compile. Rejected for this change: it reshapes the ledger's public
  contract and its tests for a guarantee the single private resolver already
  provides. Worth revisiting if a third seating path appears.
- **Let the voice pack outrank the manifest's own `remarks`.** Rejected:
  `RemarkPicker`'s precedence (manifest, then voice, then built-in) is
  deliberate — a pet that declares its own remark pools keeps its author's copy.

## Consequences

- A translated namespace now renders on every surface of the floating pet, not
  only in the settings card.
- A voice pack's remarks survive the settings surface. The pet the report came
  from (a global `.voice.json` with Russian remark pools) answered a petting from
  the built-in pools before this change and from the voice pack after it.
- Pets that declare their own manifest `remarks` are unaffected: their pools
  still outrank the voice packs, and only the pets without them fall through.
- `src/service.test.ts` (new) pins both seating paths: the startup path answers
  from the voice pack, the settings path and the `setPetId` RPC keep it. A mount
  assertion in `src/client/index.test.tsx` pins the seat binding
  (`localeSeats()` contains `pet`). Reverting the two source changes fails
  exactly these tests — the client one with `localeSeats()` empty, the service
  one with a built-in line where the voice line belongs.
- Verification: `pnpm typecheck` clean, `pnpm test` 619 passed / 49 files,
  `pnpm build` emits the bound seat into `lib/client.js`.
- Environment note, not touched here: `tests/service-enabled.spec.ts` builds its
  service without a registry fixture, so it reads the machine's `$DSH_HOME/pets`.
  A global `.voice.json` on the developer's machine changes those expectations
  (19 failures were observed with one installed, none without it) — the specs are
  host-dependent, not wrong.
- Not covered: no live GUI verification in this environment. The picker-level
  reproduction was run against the published 0.4.5 build in a live profile: the
  first petting answered `咕噜咕噜～被摸摸好舒服！` before the change and the
  voice-pack line after it.
