import { App, Modal, Setting } from "obsidian";

export type InboxTaskSubmit = (title: string) => void | Promise<void>;

export class InboxTaskModal extends Modal {
  private title = "";

  constructor(app: App, private readonly onSubmit: InboxTaskSubmit) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText("添加到滴答收集箱");

    const setting = new Setting(contentEl)
      .setName("任务标题")
      .addText((text) => {
        text.setPlaceholder("输入任务名");
        text.inputEl.style.width = "100%";
        text.onChange((value) => {
          this.title = value;
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
          .setButtonText("添加")
          .setCta()
          .onClick(() => void this.submit())
      )
      .addButton((btn) => btn.setButtonText("取消").onClick(() => this.close()));
  }

  private async submit(): Promise<void> {
    const trimmed = this.title.trim();
    if (!trimmed) return;
    this.close();
    await this.onSubmit(trimmed);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
