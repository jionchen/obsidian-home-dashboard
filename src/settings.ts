export type HomeDashboardSettings = {
  dailyNoteFolder: string;
  pinnedFiles: string[];
  workFocusFolders: string[];
  recentLimit: number;
};

export const DEFAULT_SETTINGS: HomeDashboardSettings = {
  dailyNoteFolder: "每日一记",
  pinnedFiles: [
    "每日一记",
    "平台售后支撑",
    "工作/属地化",
    "个人知识库/hermes agent常用命令.md",
    "Excalidraw"
  ],
  workFocusFolders: [
    "平台售后支撑",
    "工作/属地化",
    "Excalidraw"
  ],
  recentLimit: 6
};
