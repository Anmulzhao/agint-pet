# Agent Note: The pet settings form late-binds instead of resolving once in apply()

Status: implemented

## Problem

On DSH 0.2.0 the pet settings page (`settings.section` id `pet`) rendered its
title and subtitle correctly and then nothing but the red "this plugin's
configuration namespace is not exposed to the settings page" notice, for every
install of the aggregate `@linxin666/dsh-web-all`. The Host was provably fine:
`POST /api/dsh-web-ui-settings/describe` listed `pet` among the served
namespaces and `mutate` accepted a `{"ns":"pet"}` request, answering
`entryId: "web-ui-pet"`.

The client resolved its form exactly once, at the top of `apply()`:

```ts
const settingsForm = petSettingsForm(ctx)   // one probe, then kept for the page's life
```

`petSettingsForm` read `ctx.get('webUiSettings')` and, finding nothing, fell
back to `ctx.configForms.get(servedEntryId(...))`. That probe lands inside a
window the aggregate opens for itself: its root `apply` calls
`mountClientChildren(ctx)` fire-and-forget, and that function's first statement
is `await fetchActiveRows()`. The settings bridge is one of the inlined
children, so it cannot publish `webUiSettings` until that await settles — while
a standalone loader entry such as this plugin has already applied. The
inlined siblings are unaffected because their forms are bound *inside*
`mountClientChildren`, after the service exists; only an independently-applied
package can observe the window.

The fallback then could not rescue the page either. `configForms` is keyed by
**profile row id**, and the aggregate renames the child row `pet` to
`web-ui-pet`; the family alias `pet` exists only inside the bridge. So the
fallback resolved a key the mirror never serves and reported `unavailable`
forever, which the card renders as "not exposed" — indistinguishable from a Host
that genuinely does not serve the namespace. On 0.1.5 the settings were one
document per plugin and this never arose; per-row `Config` forms plus a
namespace alias are what made the timing a visible failure.

## Decision

**Resolve the settings form lazily and keep the resolution correct, rather than
probing once at apply time.**

`DeferredSettingsForm` in `src/client/index.ts` implements the `ConfigForm`
contract and delegates every member to whichever form is currently real:

- it adopts the family binder the moment that service appears, mirroring the
  bound form's changes onto its own subscribers, so the settings card and the
  pet UI both re-sync on the swap;
- while unresolved it publishes a `loading` snapshot, so the page shows a
  transient state rather than a false "not exposed";
- it probes on a short timer (250 ms) for a bounded window, and the fallback it
  eventually binds is keyed by a **served** row id, resolved from the mirror's
  own namespace list rather than assuming the family alias is a `configForms`
  key;
- the fiber effect disposes it, so a torn-down instance can never bind or
  publish later.

Waiting is conditional, and this is the part that keeps the fix from trading one
regression for another: the retry loop runs **only while the shared form actually
reports `unavailable`**. A standalone install — where the plugin's own row id
*is* the served key and the fallback answers `ready` on the first read — adopts
it immediately and never waits. An unconditional wait window would have delayed
every standalone install by the full window for a binder that is never coming.

## Alternatives considered

- **Await `mountClientChildren(ctx)` in the aggregate's root `apply`.**
  Rejected here, not because it is wrong but because it is a different owner's
  decision: it changes the start order of every inlined child at once, and the
  boot-splash timing that the same `apply` protects is deliberately
  time-critical. The plugin must also be correct when installed without the
  aggregate, which a change confined to the aggregate cannot guarantee.
- **Declare `webUiSettings` as an inject on this plugin.** Rejected: a
  hard inject makes the whole fiber wait for a service that only exists in
  aggregate installs, so a standalone install would never apply.
- **Keep the placeholder and never rebind.** Rejected: that is the reported
  defect. A placeholder is only honest if something eventually replaces it.
- **Poll unconditionally for a fixed window before adopting the fallback.**
  Rejected. It is correct for the aggregate and needlessly slow for every
  standalone install; the `fallbackSettled()` condition carries the same
  information without the cost.

## Consequences

- The pet settings page renders its full form on an aggregate install, and the
  page no longer claims a namespace the Host is serving is unexposed.
- A standalone install is unaffected: the fallback is adopted on the first read
  and no retry timer is armed.
- While the window is open the pet surface stays hidden (the form reports
  `loading`, which is not `ready`), and appears once the binder lands. That is
  the same "not yet" semantics the card already used for loading, now bounded
  by the retry instead of by the page's lifetime.
- The `unavailable` fallback writer described in
  `2026-09-26-pet-visibility-without-host-form.md` is unchanged and still
  applies when no form can be resolved at all; this change only stops the
  aggregate race from being mistaken for that case.
- A regression test in `src/client/index.test.tsx` reproduces the race: the
  binder is published *after* `apply()` and the form must rebind to `pet`.
  Verified by reverting to single-probe behaviour, against which it fails
  (`boundNamespaces()` is `[]`), and passes with the fix.
- Verification: `pnpm typecheck` clean, `pnpm test` 568 passed / 46 files,
  `pnpm build` emits `DeferredSettingsForm` into `lib/client.js`.
- Not covered: no live GUI verification. The profile running on this machine
  does not have the pet plugin installed (`/api/dsh-web-all/rows` lists no pet
  child and `describe` serves no `pet` namespace), so the repaired page could
  not be opened and screenshotted here. The evidence is the race reproduction
  test and the built artifact, not a rendered session.

## Coverage gaps

- The aggregate-side ordering remains unchanged. Other independently-applied
  packages can depend on services that the aggregate's inlined children publish
  after the same await, and this note fixes only the pet's own dependency.
- `mountClientChildren`'s `ownClientEntryIds()` treats a package id appearing
  in `__DSH_BOOT__.entries` as proof the loader serves that child, and skips
  mounting it. A package injected through another plugin's `dsh.client.inject`
  lands in those entries, so the inlined child (and the services it publishes)
  is skipped with nothing taking its place. Reported alongside this issue; not
  addressed here.
