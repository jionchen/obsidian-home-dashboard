import { App, Modal, Setting } from "obsidian";

export type InboxTaskSubmit = (title: string, dueDate?: Date | null) => void | Promise<void>;

type DatePresetKey = "keep" | "none" | "today" | "in3" | "in5" | "in7";

type DatePreset = { key: DatePresetKey; label: string; offset: number | null };

const ADD_PRESETS: DatePreset[] = [
  { key: "none", label: "不设日期", offset: null },
  { key: "today", label: "今天", offset: 0 },
  { key: "in3", label: "三天后", offset: 3 },
  { key: "in5", label: "五天后", offset: 5 },
  { key: "in7", label: "一周后", offset: 7 }
];

const EDIT_PRESETS: DatePreset[] = [
  { key: "keep", label: "保持原日期", offset: null },
  ...ADD_PRESETS
];

const endOfDayPlus = (offsetDays: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(23, 59, 0, 0);
  return d;
};

export type InboxTaskModalOptions = {
  initialTitle?: string;
  initialDueDate?: Date;
  modalTitle?: string;
  submitLabel?: string;
};

export class InboxTaskModal extends Modal {
  private title: string;
  private preset: DatePresetKey;
  private readonly options: InboxTaskModalOptions;
  private readonly editMode: boolean;

  constructor(app: App, private readonly onSubmit: InboxTaskSubmit, options: InboxTaskModalOptions = {}) {
    super(app);
    this.options = options;
    this.title = options.initialTitle?.trim() ?? "";
    this.editMode = options.initialDueDate !== undefined || options.modalTitle === "编辑代办";
    this.preset = this.editMode && options.initialDueDate ? "keep" : "none";
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText(this.options.modalTitle ?? (this.editMode ? "编辑代办" : "添加到滴答收集箱"));

    const titleSetting = new Setting(contentEl)
      .setName("任务标题")
      .addText((text) => {
        text.setPlaceholder("输入任务名");
        text.inputEl.style.width = "100%";
        if (this.title) text.setValue(this.title);
        text.onChange((value) => {
          this.title = value;
        });
        window.setTimeout(() => {
          text.inputEl.focus();
          text.inputEl.select();
        }, 0);
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void this.submit();
          }
        });
      });
    titleSetting.controlEl.style.width = "100%";
    titleSetting.settingEl.style.flexWrap = "wrap";

    new Setting(contentEl).setName("截止时间").then((s) => {
      const presets = this.editMode ? EDIT_PRESETS : ADD_PRESETS;
      const row = s.controlEl.createDiv("ohd-modal-chip-row");
      const chips = new Map<DatePresetKey, HTMLButtonElement>();
      presets.forEach((p) => {
        const chip = row.createEl("button", {
          text: p.label,
          cls: this.preset === p.key ? "ohd-modal-chip active" : "ohd-modal-chip",
          attr: { type: "button" }
        });
        chips.set(p.key, chip);
        chip.addEventListener("click", () => {
          this.preset = p.key;
          chips.forEach((c, k) => c.toggleClass("active", k === p.key));
        });
      });
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText(this.options.submitLabel ?? (this.editMode ? "保存" : "添加"))
          .setCta()
          .onClick(() => void this.submit())
      )
      .addButton((btn) => btn.setButtonText("取消").onClick(() => this.close()));
  }

  private async submit(): Promise<void> {
    const trimmed = this.title.trim();
    if (!trimmed) return;
    const due = this.resolveDue();
    this.close();
    await this.onSubmit(trimmed, due);
  }

  private resolveDue(): Date | null | undefined {
    if (this.preset === "keep") return undefined;
    if (this.preset === "none") return null;
    const presets = this.editMode ? EDIT_PRESETS : ADD_PRESETS;
    const preset = presets.find((p) => p.key === this.preset);
    return preset && preset.offset !== null ? endOfDayPlus(preset.offset) : null;
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
