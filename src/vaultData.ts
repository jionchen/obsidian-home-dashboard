import { TFile, type App } from "obsidian";
import type { HomeDashboardSettings } from "./settings";

export type RecentFileItem = {
  path: string;
  basename: string;
  folder: string;
  mtime: number;
};

export type WorkFocusItem = {
  label: string;
  path: string;
  count: number;
  latest?: RecentFileItem;
};

export type VaultOverview = {
  noteCount: number;
  drawingCount: number;
};

const isMarkdown = (file: TFile) => file.extension === "md";

export function makePathFilter(settings: HomeDashboardSettings) {
  const prefixes = settings.ignoredPathPrefixes
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => (p.endsWith("/") ? p : `${p}/`));
  return (path: string) => prefixes.some((prefix) => path.startsWith(prefix));
}

const dirname = (path: string) => {
  const index = path.lastIndexOf("/");
  return index >= 0 ? path.slice(0, index) : "";
};

export function getTodayDailyPath(settings: HomeDashboardSettings, date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${settings.dailyNoteFolder}/${yyyy}-${mm}-${dd}.md`;
}

export function getRecentMarkdownFiles(app: App, settings: HomeDashboardSettings): RecentFileItem[] {
  const isIgnored = makePathFilter(settings);
  return app.vault
    .getFiles()
    .filter((file) => isMarkdown(file) && !isIgnored(file.path))
    .sort((a, b) => b.stat.mtime - a.stat.mtime)
    .slice(0, settings.recentLimit)
    .map((file) => ({
      path: file.path,
      basename: file.basename,
      folder: dirname(file.path),
      mtime: file.stat.mtime
    }));
}

export function getVaultOverview(app: App, settings: HomeDashboardSettings): VaultOverview {
  const isIgnored = makePathFilter(settings);
  const files = app.vault.getFiles();
  return {
    noteCount: files.filter((file) => isMarkdown(file) && !isIgnored(file.path)).length,
    drawingCount: files.filter((file) => file.path.startsWith("Excalidraw/") || file.path.endsWith(".excalidraw.md")).length
  };
}

export function getWorkFocus(app: App, settings: HomeDashboardSettings): WorkFocusItem[] {
  const isIgnored = makePathFilter(settings);
  const files = app.vault.getFiles().filter((file) => isMarkdown(file) && !isIgnored(file.path));
  return settings.workFocusFolders.map((folder) => {
    const matches = files
      .filter((file) => file.path === folder || file.path.startsWith(`${folder}/`))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);
    const latest = matches[0];
    return {
      label: folder.split("/").at(-1) || folder,
      path: folder,
      count: matches.length,
      latest: latest
        ? {
            path: latest.path,
            basename: latest.basename,
            folder: dirname(latest.path),
            mtime: latest.stat.mtime
          }
        : undefined
    };
  });
}

export async function openPath(app: App, path: string): Promise<boolean> {
  const abstractFile = app.vault.getAbstractFileByPath(path);
  if (abstractFile instanceof TFile) {
    await app.workspace.getLeaf(false).openFile(abstractFile);
    return true;
  }
  const file = app.vault.getFiles().find((candidate) => candidate.path === path || candidate.path.startsWith(`${path}/`));
  if (file) {
    await app.workspace.getLeaf(false).openFile(file);
    return true;
  }
  return false;
}
