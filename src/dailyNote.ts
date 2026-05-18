import { App, Notice, TFile, normalizePath } from "obsidian";
import type { HomeDashboardSettings } from "./settings";
import { getTodayDailyPath } from "./vaultData";

export async function openOrCreateDaily(app: App, settings: HomeDashboardSettings): Promise<void> {
  const normalized = normalizePath(getTodayDailyPath(settings));
  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing instanceof TFile) {
    await app.workspace.getLeaf(false).openFile(existing);
    return;
  }
  const folder = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
  if (folder && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* folder may already exist after race; ignore */
    }
  }
  try {
    const created = await app.vault.create(normalized, "");
    await app.workspace.getLeaf(false).openFile(created);
  } catch (err) {
    new Notice("无法创建今日笔记");
    console.error("[home-dashboard] create daily failed", err);
  }
}
