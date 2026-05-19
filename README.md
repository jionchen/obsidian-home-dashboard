# Obsidian Home Dashboard

A focused Obsidian dashboard plugin for the current vault workflow:

- Daily note entry for `每日一记`
- Two-column DidaSync task dispatch
- Work focus from support, localization, and Excalidraw folders
- Recent edits
- Lightweight vault overview

## DidaSync Integration

This plugin integrates defensively with `CYZice/Obsidian-DidaSync` by checking for the installed plugin id `Obsidian-DidaSync`.

When available, it reads cached tasks from DidaSync settings and calls its runtime methods for:

- toggling task completion
- creating inbox tasks
- triggering manual sync

If DidaSync is not enabled, the dashboard still works for notes, recent edits, and vault overview.

## Development

```bash
npm install
npm test
npm run build
```

### Deploy to a local vault

`scripts/deploy.mjs` copies `main.js`, `styles.css`, and `manifest.json` into your Obsidian plugin folder. The default target is baked in for the maintainer's vault; override with `OBSIDIAN_PLUGIN_DIR` for any other setup.

```bash
# build + copy in one shot
npm run release

# copy only (when the build artefacts are already fresh)
npm run deploy

# point at a different vault
OBSIDIAN_PLUGIN_DIR=/path/to/vault/.obsidian/plugins/home-dashboard npm run deploy
```

After deploying, toggle the plugin off and on in Obsidian so it reloads `styles.css` and `main.js`.
