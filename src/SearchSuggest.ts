import { AbstractInputSuggest, App, TFile, prepareFuzzySearch } from "obsidian";

export class NoteSearchSuggest extends AbstractInputSuggest<TFile> {
  constructor(app: App, private readonly input: HTMLInputElement) {
    super(app, input);
  }

  getSuggestions(query: string): TFile[] {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const match = prepareFuzzySearch(trimmed);
    const hits: Array<{ file: TFile; score: number }> = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const r = match(file.path);
      if (r) hits.push({ file, score: r.score });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, 8).map((h) => h.file);
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.addClass("ohd-suggest-row");
    el.createDiv({ text: file.basename, cls: "ohd-suggest-title" });
    el.createDiv({ text: file.parent?.path ?? "/", cls: "ohd-suggest-folder" });
  }

  selectSuggestion(file: TFile): void {
    void this.app.workspace.getLeaf(false).openFile(file);
    this.input.value = "";
    this.close();
  }
}
