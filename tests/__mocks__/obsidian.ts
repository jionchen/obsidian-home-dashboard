export class TFile {
  path = "";
  basename = "";
  extension = "";
  stat = { mtime: 0 };
}

export class TFolder {
  path = "";
}

export type App = unknown;
