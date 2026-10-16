# jyn-loli review evidence (PR #16)

Review evidence for the jyn-loli pull request. It is review material, not pet content: nothing
here is read by the plugin, and `docs/` is outside `package.json`'s `files` whitelist, so none of
it is published. Drop the directory before merge if you would rather not carry it.

| File | What it shows |
| --- | --- |
| `jyn-loli-picker.png` | Settings > 宠物, the pet selector displaying 鲸鱼娘·萝莉. See the caveat below. |
| `jyn-loli-settings.png` | The whole 宠物 settings card the selector lives in, same session. |
| `picker-options.txt` | The selector's option list, read out of the live DOM unmodified. |
| `live-gui-pets.txt` | `GET /api/pet/pets` and `GET /api/pet/state` read off the **running desktop shell** at the same moment. |

## How these were captured

The desktop shell's Web UI is gated by the harness browser-session cookie. That cookie sits in
the running app's own store (`%APPDATA%/@deepseek-ai/dsh-desktop/Network/Cookies`), which the app
holds open exclusively — a shared-mode read is refused — and the launch token that mints the
cookie only ever exists in the shell's process memory. So the screenshot was driven against a
**second `dsh web` shell booted from the same profile and the same `$DSH_HOME`**
(`dsh web --port 3080 --no-open`), which prints its own authenticated URL at startup. That shell
loads the same `web-ui-pet` plugin and the same `$DSH_HOME/pets`, so the card in the image is the
shipped plugin's own settings card, rendered by the real shell.

The running desktop shell serves jyn-loli as well: `live-gui-pets.txt` is the registry and the
state snapshot read straight off `http://127.0.0.1:19387` (that endpoint is not behind the gate)
while the capture ran — it lists `jyn-loli=鲸鱼娘·萝莉` and reports `pet id: jyn-loli`.

**Caveat on the screenshot.** The selector is a native `<select>`, whose open dropdown is browser
chrome that cannot be captured. The capture re-writes the control through the native value setter
and then **verifies** it (`select displaying at capture time: 鲸鱼娘·萝莉`, asserted before the
image is written); no `change` event is dispatched, so nothing is staged or persisted. The
unmodified evidence for "the selector lists jyn-loli" is `picker-options.txt`.

Note that the persisted selection already **was** `jyn-loli` before the capture
(`persisted selection at capture time: jyn-loli`), which is why `/api/pet/state` reports that pet
id on the running shell — the write is a no-op there, not a staged value.

## One difference worth stating

The fresh shell reads the current pet directories (13 registry entries, including pets installed
after the desktop shell started); the desktop shell still serves the registry it built at startup
(9 entries). Both contain `jyn-loli`. This is the documented startup-snapshot behaviour, not a
difference in what is installed.
