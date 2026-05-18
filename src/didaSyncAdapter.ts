import type { DidaTaskLike } from "./taskPlanner";

export const DIDA_SYNC_PLUGIN_ID = "Obsidian-DidaSync";

type DidaSyncPluginLike = {
  settings?: {
    tasks?: DidaTaskLike[];
    autoSync?: boolean;
    syncInterval?: number;
  };
  toggleTask?: (index: number) => unknown | Promise<unknown>;
  createTaskInDidaList?: (task: DidaTaskLike) => unknown | Promise<unknown>;
  saveSettings?: () => unknown | Promise<unknown>;
  refreshTaskView?: () => unknown;
  manualSync?: () => unknown | Promise<unknown>;
};

type ObsidianAppLike = {
  plugins?: {
    plugins?: Record<string, DidaSyncPluginLike | undefined>;
  };
  commands?: {
    executeCommandById?: (id: string) => unknown;
  };
};

export type DidaSyncState = {
  connected: boolean;
  canRead: boolean;
  canWrite: boolean;
  taskCount: number;
  autoSync: boolean;
  syncInterval?: number;
};

export class DidaSyncAdapter {
  constructor(private readonly app: ObsidianAppLike) {}

  private get plugin() {
    return this.app.plugins?.plugins?.[DIDA_SYNC_PLUGIN_ID];
  }

  getState(): DidaSyncState {
    const plugin = this.plugin;
    const tasks = plugin?.settings?.tasks;
    const canRead = Array.isArray(tasks);
    return {
      connected: Boolean(plugin),
      canRead,
      canWrite: Boolean(plugin?.toggleTask),
      taskCount: canRead ? tasks.length : 0,
      autoSync: Boolean(plugin?.settings?.autoSync),
      syncInterval: plugin?.settings?.syncInterval
    };
  }

  getTasks(): DidaTaskLike[] {
    const tasks = this.plugin?.settings?.tasks;
    return Array.isArray(tasks) ? tasks : [];
  }

  async toggleTask(taskId: string): Promise<boolean> {
    const plugin = this.plugin;
    if (!plugin?.toggleTask) return false;
    const index = this.getTasks().findIndex((task) => task.didaId === taskId || task.id === taskId);
    if (index < 0) return false;
    await plugin.toggleTask(index);
    return true;
  }

  async sync(): Promise<boolean> {
    const plugin = this.plugin;
    if (plugin?.manualSync) {
      await plugin.manualSync();
      return true;
    }
    if (this.app.commands?.executeCommandById) {
      this.app.commands.executeCommandById(`${DIDA_SYNC_PLUGIN_ID}:sync-dida-tasks`);
      return true;
    }
    return false;
  }

  async addInboxTask(title: string, dueDate?: Date): Promise<boolean> {
    const plugin = this.plugin;
    if (!plugin?.settings) return false;
    const due = dueDate?.toISOString();
    const task: DidaTaskLike = {
      id: Date.now().toString(),
      title,
      status: 0,
      projectId: "inbox",
      projectName: "收集箱",
      ...(due ? { startDate: due, dueDate: due } : {}),
      kind: "TEXT",
      items: []
    };
    plugin.settings.tasks = plugin.settings.tasks || [];
    plugin.settings.tasks.push(task);
    await plugin.saveSettings?.();
    plugin.refreshTaskView?.();
    if (plugin.createTaskInDidaList) {
      await plugin.createTaskInDidaList(task);
    }
    return true;
  }
}
