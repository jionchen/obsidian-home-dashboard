export type DidaTaskLike = {
  id?: string;
  didaId?: string;
  title: string;
  status: number;
  startDate?: string;
  dueDate?: string;
  projectId?: string;
  projectName?: string;
  completedTime?: string | null;
  kind?: "TEXT" | "CHECKLIST";
  items?: Array<{ status: number; title: string }>;
};

export type PlannedTask = DidaTaskLike & {
  bucket: "overdue" | "today" | "thisWeek" | "later" | "completed";
  effectiveDate?: Date;
};

export type TaskPlan = {
  current: PlannedTask[];
  week: PlannedTask[];
  allOpen: PlannedTask[];
  completed: PlannedTask[];
  counts: {
    overdue: number;
    today: number;
    thisWeek: number;
    later: number;
    completed: number;
    open: number;
    total: number;
  };
};

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const rollingWeekEnd = (date: Date) => {
  const start = dayStart(date);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
};

const parseTaskDate = (task: DidaTaskLike) => {
  const raw = task.startDate || task.dueDate;
  if (!raw) return undefined;
  const normalized = raw.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const sortByDateThenTitle = (a: PlannedTask, b: PlannedTask) => {
  const timeA = a.effectiveDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const timeB = b.effectiveDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (timeA !== timeB) return timeA - timeB;
  return a.title.localeCompare(b.title, "zh-Hans-CN");
};

export function buildTaskPlan(tasks: DidaTaskLike[], now = new Date()): TaskPlan {
  const today = dayStart(now);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const weekEnd = rollingWeekEnd(now);

  const planned = tasks.map((task): PlannedTask => {
    const effectiveDate = parseTaskDate(task);
    if (task.status === 2) return { ...task, bucket: "completed", effectiveDate };
    if (!effectiveDate) return { ...task, bucket: "later", effectiveDate };
    if (effectiveDate < today) return { ...task, bucket: "overdue", effectiveDate };
    if (effectiveDate < tomorrow) return { ...task, bucket: "today", effectiveDate };
    if (effectiveDate < weekEnd) return { ...task, bucket: "thisWeek", effectiveDate };
    return { ...task, bucket: "later", effectiveDate };
  });

  const completed = planned.filter((task) => task.bucket === "completed").sort(sortByDateThenTitle);
  const open = planned.filter((task) => task.bucket !== "completed").sort((a, b) => {
    const rank = { overdue: 0, today: 1, thisWeek: 2, later: 3, completed: 4 };
    const rankDiff = rank[a.bucket] - rank[b.bucket];
    return rankDiff || sortByDateThenTitle(a, b);
  });
  const week = open.filter((task) => task.bucket === "thisWeek").sort(sortByDateThenTitle);

  return {
    current: open,
    week,
    allOpen: open,
    completed,
    counts: {
      overdue: planned.filter((task) => task.bucket === "overdue").length,
      today: planned.filter((task) => task.bucket === "today").length,
      thisWeek: planned.filter((task) => task.bucket === "thisWeek").length,
      later: planned.filter((task) => task.bucket === "later").length,
      completed: completed.length,
      open: open.length,
      total: tasks.length
    }
  };
}
