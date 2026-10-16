# deep-chan review evidence (PR #15)

Review evidence for the deep-chan pull request. It is review material, not pet
content: nothing here is read by the plugin, and `docs/` is outside
`package.json`'s `files` whitelist, so none of it is published. Drop the
directory before merge if you would rather not carry it.

| File | What it shows |
| --- | --- |
| `desktop.png` | The 宠物 settings card on the running desktop shell with the pet selector reading `deep酱`, plus deep-chan rendered in the top-right corner of the window. |

The same image previously sat on the fork's `evidence` branch as
`deep-chan/desktop.png`; it is committed here so it survives that branch.

## What the card shows

Reading the capture left to right: 设置 → 宠物, the selector on `deep酱`, `显示宠物`
on `开`, `大小 (px)` at `115`, and `状态气泡` on `关` (the 0.4.6 switch: the pet's
own session/status bubbles are off, while bubbles pushed by third-party plugins
over the announcement contract keep rendering). The pet itself is drawn in the
top-right corner at the same moment, in its `running-right` track — the frame a
`tool` phase selects.

## Runtime confirmation beyond the image

Read live off `http://127.0.0.1:19387` while the capture was taken, on the same
shell: `GET /api/pet/pets` lists `deep-chan` with `cell 256x288`, `columns 8`,
`atlasRows 9`, `rows [6, 8, 8, 4, 5, 8, 6, 6, 6]` (57 frames); `GET /api/pet/state`
reports `pet id: deep-chan` with `displayName: deep酱`; `/api/pet/diagnostics` is
empty for the pet. Both endpoints are outside the browser-auth gate, so they can
be re-read directly.
