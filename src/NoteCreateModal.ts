import { App, Modal, Setting } from "obsidian";

export type NoteCreateSubmit = (rawName: string) => void | Promise<void>;

export class NoteCreateModal extends Modal {
  private name = "";

  constructor(app: App, private readonly onSubmit: NoteCreateSubmit) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText("新建笔记");

    const setting = new Setting(contentEl)
      .setName("笔记名")
      .setDesc("可包含路径，自动补 .md。例如 项目/某主题")
      .addText((text) => {
        text.setPlaceholder("笔记名（可含路径）");
        text.inputEl.style.width = "100%";
        text.onChange((value) => {
          this.name = value;
        });
        window.setTimeout(() => text.inputEl.focus(), 0);
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void this.submit();
          }
        });
      });
    setting.controlEl.style.width = "100%";
    setting.settingEl.style.flexWrap = "wrap";

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("新建")
          .setCta()
          .onClick(() => void this.submit())
      )
      .addButton((btn) => btn.setButtonText("取消").onClick(() => this.close()));
  }

  private async submit(): Promise<void> {
    const trimmed = this.name.trim();
    if (!trimmed) return;
    this.close();
    await this.onSubmit(trimmed);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
