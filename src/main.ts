import { Plugin, WorkspaceLeaf } from "obsidian";
import { HomeDashboardView, HOME_DASHBOARD_VIEW_TYPE } from "./HomeDashboardView";
import { DEFAULT_SETTINGS, type HomeDashboardSettings } from "./settings";
import { HomeDashboardSettingTab } from "./settingsTab";

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
