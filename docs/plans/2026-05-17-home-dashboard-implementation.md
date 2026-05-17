# Obsidian Home Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Obsidian home dashboard plugin tailored to the user's vault: daily note, DidaSync task dispatch, work focus, recent edits, and vault overview.

**Architecture:** The plugin registers a custom dashboard view and a ribbon/command to open it. Pure data modules classify DidaSync tasks, derive recent files and vault stats, and keep the rendering layer thin. A defensive DidaSync adapter reads `Obsidian-DidaSync` when present and calls its public-ish runtime methods only after capability checks.

**Tech Stack:** Obsidian plugin API, TypeScript, esbuild, Vitest, CSS.

---

### Task 1: Test Data Logic

**Files:**
- Create: `tests/taskPlanner.test.ts`
- Create: `tests/didaSyncAdapter.test.ts`
- Create: `package.json`
- Create: `tsconfig.json`

**Steps:**
1. Write failing tests for Dida task bucketing and adapter reads/toggles.
2. Run `npm test` and confirm imports fail before implementation.
3. Implement `src/taskPlanner.ts` and `src/didaSyncAdapter.ts`.
4. Run `npm test` and confirm green.

### Task 2: Build Obsidian Plugin Shell

**Files:**
- Create: `manifest.json`
- Create: `versions.json`
- Create: `esbuild.config.mjs`
- Create: `src/main.ts`
- Create: `src/HomeDashboardView.ts`
- Create: `src/vaultData.ts`
- Create: `src/settings.ts`

**Steps:**
1. Register view, ribbon icon, and commands.
2. Render the approved dashboard sections.
3. Wire task add/toggle/sync actions through `DidaSyncAdapter`.
4. Wire daily note, work focus, recent edits, Excalidraw, and vault stats from local vault metadata.

### Task 3: Style And Verify

**Files:**
- Create: `styles.css`
- Create: `README.md`

**Steps:**
1. Implement the pale purple-gray iOS-style dashboard tokens.
2. Run `npm run build`.
3. Run `npm test`.
4. Check `git status`, commit, and push to `origin/main`.
