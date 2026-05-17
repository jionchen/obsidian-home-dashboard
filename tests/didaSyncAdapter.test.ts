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
});
