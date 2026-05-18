import { App, Notice, TFile, normalizePath } from "obsidian";

export async function createAndOpenNote(app: App, rawName: string): Promise<void> {
  const trimmed = rawName.trim();
  if (!trimmed) return;
  const withExt = trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
  const path = normalizePath(withExt);

  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    new Notice("笔记已存在，已打开");
    await app.workspace.getLeaf(false).openFile(existing);
    return;
  }

  const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  if (folder && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* folder may exist after race; ignore */
    }
  }

  try {
    const file = await app.vault.create(path, "");
    await app.workspace.getLeaf(false).openFile(file);
  } catch (err) {
    new Notice("无法创建笔记");
    console.error("[home-dashboard] create note failed", err);
  }
}
