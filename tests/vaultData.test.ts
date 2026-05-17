import { describe, expect, it } from "vitest";
import { makePathFilter, getTodayDailyPath, getRecentMarkdownFiles, getWorkFocus, getVaultOverview } from "../src/vaultData";
import type { HomeDashboardSettings } from "../src/settings";

const baseSettings: HomeDashboardSettings = {
  dailyNoteFolder: "每日一记",
  workFocusFolders: ["平台售后支撑", "Excalidraw"],
  ignoredPathPrefixes: [".obsidian/", "attachments/", "raw"],
  recentLimit: 3
};

type Stub = { path: string; extension: string; basename: string; stat: { mtime: number } };

const file = (path: string, mtime: number): Stub => {
  const slash = path.lastIndexOf("/");
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = name.lastIndexOf(".");
  return {
    path,
    extension: dot >= 0 ? name.slice(dot + 1) : "",
    basename: dot >= 0 ? name.slice(0, dot) : name,
    stat: { mtime }
  };
};

const appWith = (files: Stub[]) =>
  ({
    vault: {
      getFiles: () => files
    }
  }) as unknown as Parameters<typeof getRecentMarkdownFiles>[0];

describe("makePathFilter", () => {
  it("matches configured prefixes and normalizes trailing slash", () => {
    const isIgnored = makePathFilter(baseSettings);
    expect(isIgnored(".obsidian/plugins/foo.md")).toBe(true);
    expect(isIgnored("attachments/a.png")).toBe(true);
    expect(isIgnored("raw/x.md")).toBe(true);
    expect(isIgnored("notes/x.md")).toBe(false);
  });

  it("returns false when prefixes list is empty", () => {
    const isIgnored = makePathFilter({ ...baseSettings, ignoredPathPrefixes: [] });
    expect(isIgnored(".obsidian/plugins/foo.md")).toBe(false);
  });
});

describe("getTodayDailyPath", () => {
  it("formats path as folder/YYYY-MM-DD.md", () => {
    const path = getTodayDailyPath(baseSettings, new Date("2026-05-17T10:00:00+08:00"));
    expect(path).toBe("每日一记/2026-05-17.md");
  });
});

describe("getRecentMarkdownFiles", () => {
  it("returns markdown files sorted by mtime, excluding ignored prefixes, limited by recentLimit", () => {
    const files = [
      file("notes/a.md", 100),
      file("notes/b.md", 300),
      file(".obsidian/plugins/foo.md", 999),
      file("attachments/img.png", 500),
      file("notes/c.md", 200),
      file("notes/d.md", 400)
    ];
    const recent = getRecentMarkdownFiles(appWith(files), baseSettings);
    expect(recent.map((f) => f.path)).toEqual(["notes/d.md", "notes/b.md", "notes/c.md"]);
  });
});

describe("getWorkFocus", () => {
  it("groups files by configured folders and picks latest", () => {
    const files = [
      file("平台售后支撑/p1.md", 100),
      file("平台售后支撑/sub/p2.md", 500),
      file("Excalidraw/draw1.md", 400),
      file("其他/x.md", 999)
    ];
    const focus = getWorkFocus(appWith(files), baseSettings);
    expect(focus.map((f) => ({ label: f.label, count: f.count, latest: f.latest?.path }))).toEqual([
      { label: "平台售后支撑", count: 2, latest: "平台售后支撑/sub/p2.md" },
      { label: "Excalidraw", count: 1, latest: "Excalidraw/draw1.md" }
    ]);
  });
});

describe("getVaultOverview", () => {
  it("counts markdown files outside ignored prefixes and drawings", () => {
    const files = [
      file("notes/a.md", 1),
      file("notes/b.md", 2),
      file(".obsidian/plugins/foo.md", 3),
      file("Excalidraw/d.md", 4),
      file("path/diagram.excalidraw.md", 5)
    ];
    const overview = getVaultOverview(appWith(files), baseSettings);
    expect(overview.noteCount).toBe(4);
    expect(overview.drawingCount).toBe(2);
  });
});
