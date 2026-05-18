import { ItemView, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import type HomeDashboardPlugin from "./main";
import { DidaSyncAdapter } from "./didaSyncAdapter";
import { buildTaskPlan, getTodayAgenda, getVisibleTasks, type PlannedTask } from "./taskPlanner";
import {
  getRecentMarkdownFiles,
  getTodayDailyPath,
  getVaultOverview,
  getWorkFocus,
  openPath,
  type RecentFileItem
} from "./vaultData";
import { InboxTaskModal } from "./InboxTaskModal";
import { NoteCreateModal } from "./NoteCreateModal";
import { createAndOpenNote } from "./noteCreate";
import { openOrCreateDaily } from "./dailyNote";
import { NoteSearchSuggest } from "./SearchSuggest";

export const HOME_DASHBOARD_VIEW_TYPE = "home-dashboard-view";

const formatDate = (date = new Date()) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);

const formatTime = (mtime: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(mtime));

const taskKey = (task: PlannedTask) => task.didaId || task.id || task.title;

type RefreshKind = "tasks" | "vault" | "all";

export class HomeDashboardView extends ItemView {
  private adapter: DidaSyncAdapter;
  private taskRange: "week" | "all" = "week";
  private expandedTaskSections: Record<"range" | "agenda", boolean> = {
    range: false,
    agenda: false
  };

  private todaySection?: HTMLElement;
  private taskSection?: HTMLElement;
  private focusSection?: HTMLElement;
  private recentSection?: HTMLElement;
  private overviewSection?: HTMLElement;
  private agendaSection?: HTMLElement;

  private refreshTimer?: number;
  private pending = new Set<RefreshKind>();

  constructor(leaf: WorkspaceLeaf, private readonly plugin: HomeDashboardPlugin) {
    super(leaf);
    this.adapter = new DidaSyncAdapter(this.app as unknown as ConstructorParameters<typeof DidaSyncAdapter>[0]);
  }

  getViewType(): string {
    return HOME_DASHBOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Home Dashboard";
  }

  getIcon(): string {
    return "layout-dashboard";
  }

  async onOpen(): Promise<void> {
    this.buildLayout();
    this.registerEvent(this.app.vault.on("modify", () => this.scheduleRefresh("vault")));
    this.registerEvent(this.app.vault.on("create", () => this.scheduleRefresh("vault")));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh("vault")));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh("vault")));
  }

  async onClose(): Promise<void> {
    if (this.refreshTimer !== undefined) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  onSettingsChange(): void {
    this.scheduleRefresh("all");
  }

  private buildLayout(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ohd-root");

    const shell = contentEl.createDiv("ohd-shell");
    this.renderHeader(shell);

    const grid = shell.createDiv("ohd-grid");
    this.todaySection = grid.createDiv("ohd-card ohd-today-card");
    this.taskSection = grid.createDiv("ohd-card ohd-task-card");
    this.focusSection = grid.createDiv("ohd-card ohd-focus-card");
    this.recentSection = grid.createDiv("ohd-card ohd-recent-card");
    this.overviewSection = shell.createDiv("ohd-overview");

    this.renderToday();
    this.renderTasks();
    this.renderFocus();
    this.renderRecent();
    this.renderOverview();
  }

  private scheduleRefresh(kind: RefreshKind): void {
    this.pending.add(kind);
    if (this.refreshTimer !== undefined) return;
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = undefined;
      const kinds = this.pending;
      this.pending = new Set();
      if (kinds.has("all")) {
        this.renderToday();
        this.renderTasks();
        this.renderFocus();
        this.renderRecent();
        this.renderOverview();
        return;
      }
      if (kinds.has("tasks")) {
        this.renderTasks();
        this.renderTodayAgenda();
        this.renderOverview();
      }
      if (kinds.has("vault")) {
        this.renderToday();
        this.renderFocus();
        this.renderRecent();
        this.renderOverview();
      }
    }, 300);
  }

  private renderHeader(container: HTMLElement): void {
    const header = container.createDiv("ohd-header");
    const titleWrap = header.createDiv("ohd-title-wrap");
    titleWrap.createEl("h1", { text: "Home" });
    titleWrap.createSpan({ text: `v${this.plugin.manifest.version}`, cls: "ohd-version" });
    titleWrap.createSpan({ text: formatDate(), cls: "ohd-date" });

    const actions = header.createDiv("ohd-header-actions");
    const search = header.createEl("input", {
      type: "search",
      placeholder: "搜索笔记 / 输入命令",
      cls: "ohd-search"
    });
    new NoteSearchSuggest(this.app, search);
    search.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const command = search.value.trim();
        if (command) void this.app.workspace.openLinkText(command, "", false);
      }
    });
    // Reorder so search sits between title and actions
    header.insertBefore(search, actions);

    const add = actions.createEl("button", { cls: "ohd-button ohd-button-primary" });
    setIcon(add, "plus");
    add.createSpan({ text: "新建" });
    add.addEventListener("click", () => this.openCreateNoteModal());
  }

  private openCreateNoteModal(): void {
    new NoteCreateModal(this.app, (raw) => createAndOpenNote(this.app, raw)).open();
  }

  private renderToday(): void {
    if (!this.todaySection) return;
    const card = this.todaySection;
    card.empty();
    const dailyPath = getTodayDailyPath(this.plugin.settings);
    const top = card.createDiv("ohd-card-top");
    top.createEl("h2", { text: "今日笔记" });
    top.createSpan({ text: "Notebook", cls: "ohd-code-pill" });

    const body = card.createDiv("ohd-daily-main");
    body.createDiv({ text: dailyPath.replace(/\.md$/, ""), cls: "ohd-daily-title" });
    body.createDiv({ text: "连接每日记录和今天的滴答任务", cls: "ohd-muted" });

    const week = card.createDiv("ohd-week-strip");
    const today = new Date();
    const dayIndex = (today.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayIndex);
    ["一", "二", "三", "四", "五", "六", "日"].forEach((day, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const item = week.createDiv(index === dayIndex ? "ohd-week-day active" : "ohd-week-day");
      item.createSpan({ text: day });
      item.createSpan({ text: String(d.getDate()) });
    });

    this.agendaSection = card.createDiv("ohd-today-agenda");
    this.renderTodayAgenda();

    const actions = card.createDiv("ohd-card-actions");
    const open = actions.createEl("button", { text: "打开今日", cls: "ohd-button ohd-button-primary" });
    open.addEventListener("click", () => void this.openDaily());
    const quick = actions.createEl("button", { text: "新增代办", cls: "ohd-button ohd-button-ghost" });
    quick.addEventListener("click", () => this.openAddTaskModal());
  }

  private async openDaily(): Promise<void> {
    await openOrCreateDaily(this.app, this.plugin.settings);
    this.scheduleRefresh("vault");
  }

  private renderTodayAgenda(): void {
    if (!this.agendaSection) return;
    const section = this.agendaSection;
    section.empty();

    const plan = buildTaskPlan(this.adapter.getTasks());
    const items = getTodayAgenda(plan);

    const head = section.createDiv("ohd-agenda-head");
    head.createEl("h3", { text: "今日议程" });
    head.createSpan({ text: String(items.length), cls: "ohd-chip" });

    if (items.length === 0) {
      const empty = section.createDiv("ohd-empty");
      empty.createDiv({ text: "今天暂无安排", cls: "ohd-muted" });
      const add = empty.createEl("button", { text: "新建任务", cls: "ohd-button ohd-button-ghost" });
      add.addEventListener("click", () => this.openAddTaskModal());
      return;
    }

    const visible = getVisibleTasks(items, this.expandedTaskSections.agenda);
    const list = section.createDiv("ohd-task-list");
    visible.items.forEach((task) => this.renderTaskRow(list, task, { showOverduePill: true }));

    if (items.length > 5) {
      const more = section.createEl("button", {
        text: this.expandedTaskSections.agenda ? "收起" : `查看全部 ${visible.hiddenCount}`,
        cls: "ohd-button ohd-button-ghost ohd-task-more",
        attr: { type: "button" }
      });
      more.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.expandedTaskSections.agenda = !this.expandedTaskSections.agenda;
        this.renderTodayAgenda();
      });
    }
  }

  private renderTasks(): void {
    if (!this.taskSection) return;
    const card = this.taskSection;
    card.empty();
    const state = this.adapter.getState();
    const plan = buildTaskPlan(this.adapter.getTasks());

    const top = card.createDiv("ohd-card-top");
    const title = top.createDiv();
    title.createEl("h2", { text: "滴答待办" });
    title.createDiv({
      text: state.connected ? `自动同步 ${state.syncInterval ?? "-"}min` : "未连接 Obsidian-DidaSync",
      cls: "ohd-muted"
    });
    const stats = top.createDiv("ohd-chip-row");
    stats.createSpan({ text: `逾期 ${plan.counts.overdue}`, cls: "ohd-chip danger" });
    stats.createSpan({ text: `今天 ${plan.counts.today}`, cls: "ohd-chip primary" });
    stats.createSpan({ text: `未完成 ${plan.counts.open}`, cls: "ohd-chip" });
    const syncBtn = stats.createEl("button", { text: "同步", cls: "ohd-button ohd-button-ghost ohd-button-compact" });
    syncBtn.addEventListener("click", async () => {
      const ok = await this.adapter.sync();
      new Notice(ok ? "已触发滴答同步" : "未检测到 Obsidian-DidaSync 同步能力");
      this.scheduleRefresh("tasks");
    });

    const addRow = card.createDiv("ohd-task-add");
    const input = addRow.createEl("input", { type: "text", placeholder: "添加到收集箱...", cls: "ohd-input" });
    const add = addRow.createEl("button", { cls: "ohd-button ohd-button-primary" });
    setIcon(add, "plus");
    add.createSpan({ text: "添加" });
    const triggerAdd = () => {
      const value = input.value;
      input.value = "";
      this.openAddTaskModal(value);
    };
    add.addEventListener("click", triggerAdd);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") triggerAdd();
    });

    const range = card.createDiv("ohd-task-column");
    const rangeHeader = range.createDiv("ohd-task-range-head");
    rangeHeader.createEl("h3", { text: "代办" });
    const switcher = rangeHeader.createDiv("ohd-segment");
    const weekBtn = switcher.createEl("button", { text: "本周", cls: this.taskRange === "week" ? "active" : "" });
    const allBtn = switcher.createEl("button", { text: "全部", cls: this.taskRange === "all" ? "active" : "" });
    weekBtn.addEventListener("click", () => {
      this.taskRange = "week";
      this.expandedTaskSections.range = false;
      this.renderTasks();
    });
    allBtn.addEventListener("click", () => {
      this.taskRange = "all";
      this.expandedTaskSections.range = false;
      this.renderTasks();
    });

    const rangeTasks = this.taskRange === "week" ? plan.week : plan.upcoming;
    if (rangeTasks.length === 0) {
      const empty = range.createDiv("ohd-empty");
      empty.createDiv({ text: "暂无代办" });
      if (this.taskRange === "week" && plan.upcoming.length > 0) {
        const showAll = empty.createEl("button", {
          text: `查看全部 ${plan.upcoming.length}`,
          cls: "ohd-button ohd-button-ghost"
        });
        showAll.addEventListener("click", () => {
          this.taskRange = "all";
          this.renderTasks();
        });
      }
    } else {
      this.renderTaskList(range, rangeTasks);
    }
  }

  private renderTaskList(container: HTMLElement, tasks: PlannedTask[]): void {
    const visible = getVisibleTasks(tasks, this.expandedTaskSections.range);
    const list = container.createDiv("ohd-task-list");
    visible.items.forEach((task) => this.renderTaskRow(list, task, { showOverduePill: false }));

    if (tasks.length > 5) {
      const more = container.createEl("button", {
        text: this.expandedTaskSections.range ? "收起" : `查看全部 ${visible.hiddenCount}`,
        cls: "ohd-button ohd-button-ghost ohd-task-more",
        attr: { type: "button" }
      });
      more.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.expandedTaskSections.range = !this.expandedTaskSections.range;
        this.renderTasks();
      });
    }
  }

  private renderFocus(): void {
    if (!this.focusSection) return;
    const card = this.focusSection;
    card.empty();
    const top = card.createDiv("ohd-card-top");
    top.createEl("h2", { text: "工作焦点" });
    top.createSpan({ text: "Local", cls: "ohd-code-pill" });
    const focus = getWorkFocus(this.app, this.plugin.settings);
    if (focus.length === 0) {
      card.createDiv({ text: "未配置工作焦点目录", cls: "ohd-muted" });
      return;
    }
    const list = card.createDiv("ohd-focus-list");
    focus.forEach((item) => {
      const row = list.createDiv("ohd-focus-row");
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      const icon = row.createDiv("ohd-focus-icon");
      setIcon(icon, item.label.includes("Excalidraw") ? "pen-tool" : "folder-kanban");
      const main = row.createDiv("ohd-focus-main");
      main.createDiv({ text: item.label, cls: "ohd-focus-title" });
      main.createDiv({ text: item.latest?.path || item.path, cls: "ohd-muted" });
      row.createSpan({ text: `${item.count}`, cls: "ohd-soft-pill" });
      const go = () => void openPath(this.app, item.latest?.path || item.path);
      row.addEventListener("click", go);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          go();
        }
      });
    });
  }

  private renderRecent(): void {
    if (!this.recentSection) return;
    const card = this.recentSection;
    card.empty();
    card.createEl("h2", { text: "最近编辑" });
    const recent = getRecentMarkdownFiles(this.app, this.plugin.settings);
    if (recent.length === 0) {
      card.createDiv({ text: "暂无最近编辑", cls: "ohd-muted" });
      return;
    }
    const list = card.createDiv("ohd-recent-list");
    recent.forEach((file) => this.renderRecentRow(list, file));
  }

  private renderRecentRow(container: HTMLElement, file: RecentFileItem): void {
    const row = container.createDiv("ohd-recent-row");
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    const icon = row.createDiv("ohd-recent-icon");
    setIcon(icon, file.path.startsWith("Excalidraw/") || file.path.endsWith(".excalidraw.md") ? "pencil-ruler" : "file-text");
    const main = row.createDiv("ohd-recent-main");
    main.createDiv({ text: file.basename, cls: "ohd-recent-title" });
    main.createDiv({ text: file.folder || "/", cls: "ohd-muted" });
    row.createSpan({ text: formatTime(file.mtime), cls: "ohd-soft-pill" });
    const go = () => void openPath(this.app, file.path);
    row.addEventListener("click", go);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        go();
      }
    });
  }

  private renderOverview(): void {
    if (!this.overviewSection) return;
    this.overviewSection.empty();
    const state = this.adapter.getState();
    const overview = getVaultOverview(this.app, this.plugin.settings);
    const entries: Array<[string, string | number]> = [
      ["笔记", overview.noteCount],
      ["未完成", buildTaskPlan(this.adapter.getTasks()).counts.open],
      ["图稿", overview.drawingCount],
      ["同步", state.connected ? `${state.syncInterval ?? "-"}min` : "未连接"]
    ];
    entries.forEach(([label, value]) => {
      const item = this.overviewSection!.createDiv("ohd-overview-item");
      item.createSpan({ text: String(value), cls: "ohd-overview-value" });
      item.createSpan({ text: label, cls: "ohd-muted" });
    });
  }

  private openAddTaskModal(initialTitle?: string): void {
    new InboxTaskModal(
      this.app,
      async (title, dueDate) => {
        const due = dueDate instanceof Date ? dueDate : undefined;
        const ok = await this.adapter.addInboxTask(title, due);
        new Notice(ok ? "已添加到滴答收集箱" : "未检测到 Obsidian-DidaSync，无法添加任务");
        this.scheduleRefresh("tasks");
      },
      { initialTitle }
    ).open();
  }

  private openEditTaskModal(task: PlannedTask): void {
    new InboxTaskModal(
      this.app,
      async (title, dueDate) => {
        const updates: { title?: string; dueDate?: Date | null } = { title };
        if (dueDate !== undefined) updates.dueDate = dueDate;
        const ok = await this.adapter.updateTask(taskKey(task), updates);
        new Notice(ok ? "代办已更新" : "无法更新该代办");
        this.scheduleRefresh("tasks");
      },
      {
        initialTitle: task.title,
        initialDueDate: task.effectiveDate,
        modalTitle: "编辑代办",
        submitLabel: "保存"
      }
    ).open();
  }

  private renderTaskRow(list: HTMLElement, task: PlannedTask, opts: { showOverduePill: boolean }): void {
    const row = list.createDiv(`ohd-task-row ${task.bucket}`);
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    const dot = row.createEl("button", { cls: "ohd-task-dot", attr: { "aria-label": "切换完成状态" } });
    if (task.status === 2) dot.textContent = "✓";
    const toggle = async () => {
      const ok = await this.adapter.toggleTask(taskKey(task));
      if (!ok) new Notice("无法通过 Obsidian-DidaSync 勾选该任务");
      this.scheduleRefresh("tasks");
    };
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      void toggle();
    });
    row.addEventListener("click", (event) => {
      if (event.target === dot || (event.target as HTMLElement | null)?.closest?.(".ohd-task-dot")) return;
      this.openEditTaskModal(task);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.openEditTaskModal(task);
      }
    });
    const meta = row.createDiv("ohd-task-meta");
    meta.createDiv({ text: task.title, cls: "ohd-task-title" });
    const sub = meta.createDiv("ohd-task-sub");
    sub.createSpan({ text: task.projectName || task.projectId || "收集箱", cls: "ohd-code-pill" });
    if (task.effectiveDate) sub.createSpan({ text: formatTime(task.effectiveDate.getTime()), cls: "ohd-soft-pill" });
    if (opts.showOverduePill && task.bucket === "overdue") {
      sub.createSpan({ text: "逾期", cls: "ohd-soft-pill danger" });
    }
  }
}
