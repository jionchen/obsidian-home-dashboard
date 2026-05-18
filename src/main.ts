import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { HomeDashboardView, HOME_DASHBOARD_VIEW_TYPE } from "./HomeDashboardView";
import { DEFAULT_SETTINGS, type HomeDashboardSettings } from "./settings";
import { HomeDashboardSettingTab } from "./settingsTab";
import { openOrCreateDaily } from "./dailyNote";
import { InboxTaskModal } from "./InboxTaskModal";
import { NoteCreateModal } from "./NoteCreateModal";
import { createAndOpenNote } from "./noteCreate";
import { DidaSyncAdapter } from "./didaSyncAdapter";

export default class HomeDashboardPlugin extends Plugin {
  settings: HomeDashboardSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(HOME_DASHBOARD_VIEW_TYPE, (leaf: WorkspaceLeaf) => new HomeDashboardView(leaf, this));

    this.addRibbonIcon("layout-dashboard", "Home Dashboard", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-home-dashboard",
      name: "Open home dashboard",
      callback: () => void this.activateView()
    });

    this.addCommand({
      id: "toggle-home-dashboard",
      name: "Toggle home dashboard",
      callback: () => {
        const leaves = this.app.workspace.getLeavesOfType(HOME_DASHBOARD_VIEW_TYPE);
        if (leaves.length > 0) {
          this.app.workspace.detachLeavesOfType(HOME_DASHBOARD_VIEW_TYPE);
        } else {
          void this.activateView();
        }
      }
    });

    this.addCommand({
      id: "open-today-daily",
      name: "Open today's daily note",
      callback: () => void openOrCreateDaily(this.app, this.settings)
    });

    this.addCommand({
      id: "new-inbox-task",
      name: "New inbox task",
      callback: () => {
        new InboxTaskModal(this.app, async (title, dueDate) => {
          const adapter = new DidaSyncAdapter(this.app as unknown as ConstructorParameters<typeof DidaSyncAdapter>[0]);
          const due = dueDate instanceof Date ? dueDate : undefined;
          const ok = await adapter.addInboxTask(title, due);
          new Notice(ok ? "已添加到滴答收集箱" : "未检测到 Obsidian-DidaSync，无法添加任务");
          this.app.workspace.getLeavesOfType(HOME_DASHBOARD_VIEW_TYPE).forEach((leaf) => {
            const view = leaf.view;
            if (view instanceof HomeDashboardView) view.onSettingsChange();
          });
        }).open();
      }
    });

    this.addCommand({
      id: "new-note",
      name: "New note",
      callback: () => {
        new NoteCreateModal(this.app, (raw) => createAndOpenNote(this.app, raw)).open();
      }
    });

    this.addSettingTab(new HomeDashboardSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(HOME_DASHBOARD_VIEW_TYPE);
  }

  async activateView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(HOME_DASHBOARD_VIEW_TYPE);
    const leaf = leaves[0] || this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: HOME_DASHBOARD_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...((await this.loadData()) || {})
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.app.workspace.getLeavesOfType(HOME_DASHBOARD_VIEW_TYPE).forEach((leaf) => {
      const view = leaf.view;
      if (view instanceof HomeDashboardView) view.onSettingsChange();
    });
  }
}
