# AnimatePop

A Chrome extension that plays a transparent cat video as a full-screen overlay on whatever tab you're viewing, on a recurring schedule. Useful as a periodic break reminder, a desk companion, or just a way to make the web a little weirder.

## Origin

My girlfriend came across the [Cat Gatekeeper Extension](https://www.catgatekeeper.org/) and asked whether we could use something like it — but with her own cat, **Oden**, instead of the default one. AnimatePop is the result: a small extension that periodically pops a transparent cat video over the page, with the videos swappable so Oden (or any cat) can take over the screen.

## How it works

AnimatePop runs a two-state cycle:

- **Cooldown** — nothing happens. Lasts for the configured *Pop-up Interval*.
- **Playing** — every tab you visit shows the cat overlay. Lasts for the configured *Playing Interval*. Videos rotate randomly from the `assets/` folder.

When the playing window ends (or you click **Stop Playing**), the extension returns to cooldown.

## Download

1. Clone or download this repository:
   ```
   git clone <repo-url>
   ```
   Or download the ZIP from GitHub and unzip it.
2. The folder you'll load into Chrome is `animatepop-ext/` — the one containing `manifest.json`.

## Install in Chrome

AnimatePop is loaded as an unpacked extension (developer mode). It's not on the Chrome Web Store.

1. Open `chrome://extensions/` in Chrome (or any Chromium-based browser: Edge, Brave, Arc).
2. Toggle **Developer mode** on (top-right corner).
3. Click **Load unpacked**.
4. Select the `animatepop-ext/` folder.
5. The AnimatePop card appears in your extension list. Pin it to the toolbar if you want quick access.

## Configure

1. On the AnimatePop card in `chrome://extensions/`, click **Details** → **Extension options**. (Or right-click the toolbar icon → **Options**.)
2. Set:
   - **Pop-up Interval** — how long to wait between plays, in minutes (cooldown length).
   - **Playing Interval** — how long the overlay stays on screen once it starts, in minutes.
3. Click **Save Settings**.

The page also shows a live state line: either `Cooldown — next play at HH:MM:SS (in Xm Ys)` or `Playing — ends at HH:MM:SS (in Xm Ys)`.

### Buttons

- **Test Now** — immediately enters the playing state, useful for previewing.
- **Stop Playing** — only enabled during playing; ends the overlay on every tab and returns to cooldown.

## Adding your own videos

1. Drop `.webm` files (transparent background recommended) into `animatepop-ext/assets/`.
2. Add their filenames to `animatepop-ext/assets/videos.json`:
   ```json
   [
     "cat_transparent.webm",
     "cat_under_table_transparent.webm",
     "your_new_clip.webm"
   ]
   ```
3. Reload the extension at `chrome://extensions/` (click the refresh icon on the AnimatePop card).

The extension picks a random video each time and chooses a different one when the current clip ends, so multiple videos rotate naturally during a playing window.

## Permissions

- `storage`, `alarms` — schedule the cycle and remember settings.
- `tabs`, `scripting`, `<all_urls>` — broadcast the overlay to every open tab and inject the content script into tabs that loaded before the extension was installed.

The extension does not make any network requests; all assets are bundled locally.

## Troubleshooting

- **Nothing happens after install.** Make sure Developer mode is on and the extension is enabled. Check the service worker console (`chrome://extensions/` → Details → "service worker" link) for errors.
- **Overlay doesn't appear on a specific tab.** Some pages can't be scripted by extensions: `chrome://*`, the Chrome Web Store, `view-source:`, and (by default) `file://`. The service worker log will print `cannot play on tab N: ...` for those.
- **Only one video keeps looping.** Confirm `videos.json` lists more than one entry, then reload the extension.
