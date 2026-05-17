import { ItemView, Notice, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import type HomeDashboardPlugin from "./main";
import { DidaSyncAdapter } from "./didaSyncAdapter";
import { buildTaskPlan, type PlannedTask } from "./taskPlanner";
import {
  getRecentMarkdownFiles,
  getTodayDailyPath,
  getVaultOverview,
  getWorkFocus,
  openPath,
  type RecentFileItem
} from "./vaultData";

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

const taskId = (task: PlannedTask) => task.didaId || task.id || task.title;

export class HomeDashboardView extends ItemView {
  private adapter: DidaSyncAdapter;
  private taskRange: "week" | "all" = "week";

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
    this.render();
    this.registerEvent(this.app.vault.on("modify", () => this.render()));
  }

  render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ohd-root");

    const shell = contentEl.createDiv("ohd-shell");
    this.renderHeader(shell);

    const grid = shell.createDiv("ohd-grid");
    this.renderTodayCard(grid);
    this.renderTaskCard(grid);
    this.renderFocusCard(grid);
    this.renderRecentCard(grid);
    this.renderOverview(shell);
  }

  private renderHeader(container: HTMLElement): void {
    const header = container.createDiv("ohd-header");
    const titleWrap = header.createDiv("ohd-title-wrap");
    titleWrap.createEl("h1", { text: "Home" });
    titleWrap.createSpan({ text: "v0.2", cls: "ohd-version" });
    titleWrap.createSpan({ text: formatDate(), cls: "ohd-date" });

    const actions = header.createDiv("ohd-header-actions");
    const search = actions.createEl("input", {
      type: "search",
      placeholder: "搜索笔记 / 输入命令",
      cls: "ohd-search"
    });
    search.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const command = search.value.trim();
        if (command) void this.app.workspace.openLinkText(command, "", false);
      }
    });

    const add = actions.createEl("button", { cls: "ohd-button ohd-button-primary" });
    setIcon(add, "plus");
    add.createSpan({ text: "新建" });
    add.addEventListener("click", () => this.createTaskFromPrompt());

    const sync = actions.createEl("button", { text: "同步滴答", cls: "ohd-button ohd-button-ghost" });
    sync.addEventListener("click", async () => {
      const ok = await this.adapter.sync();
      new Notice(ok ? "已触发滴答同步" : "未检测到 Obsidian-DidaSync 同步能力");
      this.render();
    });
  }

  private renderTodayCard(container: HTMLElement): void {
    const card = container.createDiv("ohd-card ohd-today-card");
    const dailyPath = getTodayDailyPath(this.plugin.settings);
    const top = card.createDiv("ohd-card-top");
    top.createEl("h2", { text: "今日笔记" });
    top.createSpan({ text: "Notebook", cls: "ohd-code-pill" });

    const body = card.createDiv("ohd-daily-main");
    body.createDiv({ text: dailyPath.replace(".md", ""), cls: "ohd-daily-title" });
    body.createDiv({ text: "连接每日记录和今天的滴答任务", cls: "ohd-muted" });

    const week = card.createDiv("ohd-week-strip");
    ["一", "二", "三", "四", "五", "六", "日"].forEach((day, index) => {
      const item = week.createDiv(index === 6 ? "ohd-week-day active" : "ohd-week-day");
      item.createSpan({ text: day });
      item.createSpan({ text: String(11 + index) });
    });

    const actions = card.createDiv("ohd-card-actions");
    const open = actions.createEl("button", { text: "打开今日", cls: "ohd-button ohd-button-primary" });
    open.addEventListener("click", async () => {
      const file = this.app.vault.getAbstractFileByPath(dailyPath);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf(false).openFile(file);
      } else {
        const created = await this.app.vault.create(dailyPath, "");
        await this.app.workspace.getLeaf(false).openFile(created);
      }
    });
    const quick = actions.createEl("button", { text: "写一条", cls: "ohd-button ohd-button-ghost" });
    quick.addEventListener("click", () => void openPath(this.app, dailyPath));
  }

  private renderTaskCard(container: HTMLElement): void {
    const card = container.createDiv("ohd-card ohd-task-card");
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

    const addRow = card.createDiv("ohd-task-add");
    const input = addRow.createEl("input", { type: "text", placeholder: "添加到收集箱...", cls: "ohd-input" });
    const add = addRow.createEl("button", { cls: "ohd-button ohd-button-primary" });
    setIcon(add, "plus");
    add.createSpan({ text: "添加" });
    add.addEventListener("click", () => this.addTask(input));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") void this.addTask(input);
    });

    const columns = card.createDiv("ohd-task-columns");
    const current = columns.createDiv("ohd-task-column");
    current.createEl("h3", { text: "当前要处理" });
    this.renderTaskList(current, plan.current.slice(0, 6), "current");

    const range = columns.createDiv("ohd-task-column");
    const rangeHeader = range.createDiv("ohd-task-range-head");
    rangeHeader.createEl("h3", { text: this.taskRange === "week" ? "本周计划" : "全部任务" });
    const switcher = rangeHeader.createDiv("ohd-segment");
    const weekBtn = switcher.createEl("button", { text: "本周", cls: this.taskRange === "week" ? "active" : "" });
    const allBtn = switcher.createEl("button", { text: "全部" , cls: this.taskRange === "all" ? "active" : "" });
    weekBtn.addEventListener("click", () => {
      this.taskRange = "week";
      this.render();
    });
    allBtn.addEventListener("click", () => {
      this.taskRange = "all";
      this.render();
    });

    const rangeTasks = this.taskRange === "week" ? plan.week : plan.allOpen;
    if (rangeTasks.length === 0 && this.taskRange === "week") {
      const empty = range.createDiv("ohd-empty");
      empty.createDiv({ text: "本周暂无安排" });
      const showAll = empty.createEl("button", { text: `查看全部 ${plan.counts.open}`, cls: "ohd-button ohd-button-ghost" });
      showAll.addEventListener("click", () => {
        this.taskRange = "all";
        this.render();
      });
    } else {
      this.renderTaskList(range, rangeTasks.slice(0, 6), "range");
    }
  }

  private renderTaskList(container: HTMLElement, tasks: PlannedTask[], mode: "current" | "range"): void {
    const list = container.createDiv("ohd-task-list");
    tasks.forEach((task) => {
      const row = list.createDiv(`ohd-task-row ${task.bucket}`);
      const dot = row.createEl("button", { cls: "ohd-task-dot", attr: { "aria-label": "切换完成状态" } });
      if (task.status === 2) dot.textContent = "✓";
      dot.addEventListener("click", async () => {
        const ok = await this.adapter.toggleTask(taskId(task));
        if (!ok) new Notice("无法通过 Obsidian-DidaSync 勾选该任务");
        this.render();
      });
      const meta = row.createDiv("ohd-task-meta");
      meta.createDiv({ text: task.title, cls: "ohd-task-title" });
      const sub = meta.createDiv("ohd-task-sub");
      sub.createSpan({ text: task.projectName || task.projectId || "收集箱", cls: "ohd-code-pill" });
      if (task.effectiveDate) sub.createSpan({ text: formatTime(task.effectiveDate.getTime()), cls: "ohd-soft-pill" });
      if (mode === "current" && task.bucket === "overdue") sub.createSpan({ text: "逾期", cls: "ohd-soft-pill danger" });
    });
  }

  private renderFocusCard(container: HTMLElement): void {
    const card = container.createDiv("ohd-card ohd-focus-card");
    const top = card.createDiv("ohd-card-top");
    top.createEl("h2", { text: "工作焦点" });
    top.createSpan({ text: "Local", cls: "ohd-code-pill" });
    const list = card.createDiv("ohd-focus-list");
    getWorkFocus(this.app, this.plugin.settings).forEach((item) => {
      const row = list.createDiv("ohd-focus-row");
      const icon = row.createDiv("ohd-focus-icon");
      setIcon(icon, item.label.includes("Excalidraw") ? "pen-tool" : "folder-kanban");
      const main = row.createDiv("ohd-focus-main");
      main.createDiv({ text: item.label, cls: "ohd-focus-title" });
      main.createDiv({ text: item.latest?.path || item.path, cls: "ohd-muted" });
      row.createSpan({ text: `${item.count}`, cls: "ohd-soft-pill" });
      row.addEventListener("click", () => void openPath(this.app, item.latest?.path || item.path));
    });
  }

  private renderRecentCard(container: HTMLElement): void {
    const card = container.createDiv("ohd-card ohd-recent-card");
    card.createEl("h2", { text: "最近编辑" });
    const recent = getRecentMarkdownFiles(this.app, this.plugin.settings.recentLimit);
    const list = card.createDiv("ohd-recent-list");
    recent.forEach((file) => this.renderRecentRow(list, file));
  }

  private renderRecentRow(container: HTMLElement, file: RecentFileItem): void {
    const row = container.createDiv("ohd-recent-row");
    const icon = row.createDiv("ohd-recent-icon");
    setIcon(icon, file.path.startsWith("Excalidraw/") ? "pencil-ruler" : "file-text");
    const main = row.createDiv("ohd-recent-main");
    main.createDiv({ text: file.basename, cls: "ohd-recent-title" });
    main.createDiv({ text: file.folder || "/", cls: "ohd-muted" });
    row.createSpan({ text: formatTime(file.mtime), cls: "ohd-soft-pill" });
    row.addEventListener("click", () => void openPath(this.app, file.path));
  }

  private renderOverview(container: HTMLElement): void {
    const state = this.adapter.getState();
    const overview = getVaultOverview(this.app);
    const bar = container.createDiv("ohd-overview");
    [
      ["笔记", overview.noteCount],
      ["未完成", buildTaskPlan(this.adapter.getTasks()).counts.open],
      ["图稿", overview.drawingCount],
      ["同步", state.connected ? `${state.syncInterval ?? "-"}min` : "未连接"]
    ].forEach(([label, value]) => {
      const item = bar.createDiv("ohd-overview-item");
      item.createSpan({ text: String(value), cls: "ohd-overview-value" });
      item.createSpan({ text: String(label), cls: "ohd-muted" });
    });
  }

  private async addTask(input: HTMLInputElement): Promise<void> {
    const title = input.value.trim();
    if (!title) return;
    const ok = await this.adapter.addInboxTask(title);
    new Notice(ok ? "已添加到滴答收集箱" : "未检测到 Obsidian-DidaSync，无法添加任务");
    input.value = "";
    this.render();
  }

  private async createTaskFromPrompt(): Promise<void> {
    const title = window.prompt("添加到滴答收集箱");
    if (title?.trim()) {
      const ok = await this.adapter.addInboxTask(title.trim());
      new Notice(ok ? "已添加到滴答收集箱" : "未检测到 Obsidian-DidaSync，无法添加任务");
      this.render();
    }
  }
}
