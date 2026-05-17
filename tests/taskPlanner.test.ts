import { describe, expect, it } from "vitest";
import { buildTaskPlan, type DidaTaskLike } from "../src/taskPlanner";

describe("buildTaskPlan", () => {
  const now = new Date("2026-05-17T10:00:00+08:00");

  it("groups open tasks into overdue, today, this week, and later", () => {
    const tasks: DidaTaskLike[] = [
      { id: "1", title: "旧任务", status: 0, startDate: "2026-05-16T10:00:00+0800", projectName: "收集箱" },
      { id: "2", title: "今天任务", status: 0, dueDate: "2026-05-17T12:00:00+0800", projectName: "收集箱" },
      { id: "3", title: "本周任务", status: 0, startDate: "2026-05-20T09:00:00+0800", projectName: "工作" },
      { id: "4", title: "未来任务", status: 0, startDate: "2026-05-26T09:00:00+0800", projectName: "工作" },
      { id: "5", title: "已完成", status: 2, startDate: "2026-05-17T09:00:00+0800", projectName: "收集箱" }
    ];

    const plan = buildTaskPlan(tasks, now);

    expect(plan.counts).toEqual({
      overdue: 1,
      today: 1,
      thisWeek: 1,
      later: 1,
      completed: 1,
      open: 4,
      total: 5
    });
    expect(plan.current.map((task) => task.title)).toEqual(["旧任务", "今天任务", "本周任务", "未来任务"]);
    expect(plan.week.map((task) => task.title)).toEqual(["本周任务"]);
  });

  it("prioritizes overdue and today tasks in the current column", () => {
    const tasks: DidaTaskLike[] = [
      { id: "later", title: "以后", status: 0, startDate: "2026-06-01T09:00:00+0800" },
      { id: "today", title: "今天", status: 0, startDate: "2026-05-17T09:00:00+0800" },
      { id: "overdue", title: "逾期", status: 0, startDate: "2026-05-10T09:00:00+0800" }
    ];

    const plan = buildTaskPlan(tasks, now);

    expect(plan.current.map((task) => task.id)).toEqual(["overdue", "today", "later"]);
  });
});
