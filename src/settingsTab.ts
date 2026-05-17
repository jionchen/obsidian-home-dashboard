import { App, PluginSettingTab, Setting } from "obsidian";
import type HomeDashboardPlugin from "./main";

const linesToList = (raw: string): string[] =>
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export class HomeDashboardSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: HomeDashboardPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Home Dashboard").setHeading();

    new Setting(containerEl)
      .setName("每日笔记目录")
      .setDesc("dashboard 解析今日 daily note 路径的根目录。文件名按 YYYY-MM-DD.md 生成。")
      .addText((text) =>
        text
          .setPlaceholder("每日一记")
          .setValue(this.plugin.settings.dailyNoteFolder)
          .onChange(async (value) => {
            this.plugin.settings.dailyNoteFolder = value.trim() || "每日一记";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("工作焦点目录")
      .setDesc("每行一个目录路径。dashboard 会按这些目录聚合文件数量与最近编辑。")
      .addTextArea((text) => {
        text
          .setPlaceholder("平台售后支撑\n工作/属地化\nExcalidraw")
          .setValue(this.plugin.settings.workFocusFolders.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.workFocusFolders = linesToList(value);
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 4;
        text.inputEl.style.width = "100%";
      });

    new Setting(containerEl)
      .setName("忽略的路径前缀")
      .setDesc("每行一个前缀。匹配这些前缀的文件不进入最近编辑与统计。")
      .addTextArea((text) => {
        text
          .setPlaceholder(".obsidian/\nattachments/\nnode_modules/")
          .setValue(this.plugin.settings.ignoredPathPrefixes.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.ignoredPathPrefixes = linesToList(value);
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 4;
        text.inputEl.style.width = "100%";
      });

    new Setting(containerEl)
      .setName("最近编辑展示数量")
      .setDesc("最近编辑卡片中展示的文件条数。")
      .addText((text) =>
        text
          .setPlaceholder("6")
          .setValue(String(this.plugin.settings.recentLimit))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (Number.isFinite(parsed) && parsed > 0) {
              this.plugin.settings.recentLimit = parsed;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
