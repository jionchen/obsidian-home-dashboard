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

Copy `main.js`, `manifest.json`, and `styles.css` into an Obsidian plugin folder to test locally.
