export type HomeDashboardSettings = {
  dailyNoteFolder: string;
  workFocusFolders: string[];
  ignoredPathPrefixes: string[];
  recentLimit: number;
};

export const DEFAULT_SETTINGS: HomeDashboardSettings = {
  dailyNoteFolder: "每日一记",
  workFocusFolders: [
    "平台售后支撑",
    "工作/属地化",
    "Excalidraw"
  ],
  ignoredPathPrefixes: [
    ".obsidian/",
    "attachments/",
    "node_modules/"
  ],
  recentLimit: 6
};
