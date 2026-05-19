import { copyFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_TARGET =
  "/Users/chenjiao/Library/Mobile Documents/iCloud~md~obsidian/Documents/obsidian/.obsidian/plugins/home-dashboard";

const target = process.env.OBSIDIAN_PLUGIN_DIR || DEFAULT_TARGET;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (!existsSync(target)) {
  console.error(`[deploy] target directory not found: ${target}`);
  console.error(`[deploy] set OBSIDIAN_PLUGIN_DIR to override.`);
  process.exit(1);
}

const files = ["main.js", "styles.css", "manifest.json"];
for (const f of files) {
  const src = join(root, f);
  if (!existsSync(src)) {
    console.error(`[deploy] missing source file: ${f} (did you run npm run build?)`);
    process.exit(1);
  }
  const dest = join(target, f);
  copyFileSync(src, dest);
  const { size } = statSync(dest);
  console.log(`[deploy] ${f} -> ${dest}  (${size} bytes)`);
}

console.log(`[deploy] done. Reload the plugin in Obsidian (disable + enable).`);
