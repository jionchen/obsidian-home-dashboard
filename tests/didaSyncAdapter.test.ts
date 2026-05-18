import { describe, expect, it, vi } from "vitest";
import { DIDA_SYNC_PLUGIN_ID, DidaSyncAdapter } from "../src/didaSyncAdapter";

describe("DidaSyncAdapter", () => {
  it("reports disconnected when Obsidian-DidaSync is unavailable", () => {
    const adapter = new DidaSyncAdapter({ plugins: { plugins: {} } });

    expect(adapter.getState()).toEqual({
      connected: false,
      canRead: false,
      canWrite: false,
      taskCount: 0,
      autoSync: false,
      syncInterval: undefined
    });
    expect(adapter.getTasks()).toEqual([]);
  });

  it("reads tasks and toggles by Dida id through the installed plugin", async () => {
    const toggleTask = vi.fn();
    const task = { id: "local-1", didaId: "dida-1", title: "安装同步插件", status: 0, projectName: "收集箱" };
    const adapter = new DidaSyncAdapter({
      plugins: {
        plugins: {
          [DIDA_SYNC_PLUGIN_ID]: {
            settings: {
              tasks: [task],
              autoSync: true,
              syncInterval: 5
            },
            toggleTask
          }
        }
      }
    });

    expect(adapter.getState()).toMatchObject({
      connected: true,
      canRead: true,
      canWrite: true,
      taskCount: 1,
      autoSync: true,
      syncInterval: 5
    });
    expect(adapter.getTasks()).toEqual([task]);

    const toggled = await adapter.toggleTask("dida-1");

    expect(toggled).toBe(true);
    expect(toggleTask).toHaveBeenCalledWith(0);
  });

  it("returns false when adapter has no Dida plugin to write to", async () => {
    const adapter = new DidaSyncAdapter({ plugins: { plugins: {} } });
    expect(await adapter.addInboxTask("孤儿任务")).toBe(false);
  });

  it("preserves both tasks when two addInboxTask calls run concurrently", async () => {
    const tasks: unknown[] = [];
    const saveSettings = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    const createTaskInDidaList = vi.fn(async () => {});
    const refreshTaskView = vi.fn();
    const adapter = new DidaSyncAdapter({
      plugins: {
        plugins: {
          [DIDA_SYNC_PLUGIN_ID]: {
            settings: { tasks: tasks as never },
            saveSettings,
            createTaskInDidaList,
            refreshTaskView
          }
        }
      }
    });

    const [a, b] = await Promise.all([adapter.addInboxTask("任务 A"), adapter.addInboxTask("任务 B")]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(tasks).toHaveLength(2);
    expect((tasks as Array<{ title: string }>).map((t) => t.title).sort()).toEqual(["任务 A", "任务 B"]);
    expect(saveSettings).toHaveBeenCalledTimes(2);
    expect(createTaskInDidaList).toHaveBeenCalledTimes(2);
  });
});
