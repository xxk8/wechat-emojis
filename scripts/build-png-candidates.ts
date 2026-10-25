import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES, ROOT, WORK_DIR, formatKb, type Category } from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

const PNG_CANDIDATES = join(WORK_DIR, "png-candidates");

function listPng(category: Category): string[] {
  return readdirSync(join(ROOT, "assets", category))
    .filter((name) => name.endsWith(".png"))
    .sort();
}

export function main(): void {
  rmSync(PNG_CANDIDATES, { recursive: true, force: true });
  mkdirSync(PNG_CANDIDATES, { recursive: true });

  let count = 0;
  for (const category of CATEGORIES) {
    const destination = join(PNG_CANDIDATES, category);
    mkdirSync(destination, { recursive: true });
    for (const file of listPng(category)) {
      copyFileSync(join(ROOT, "assets", category, file), join(destination, file));
      count += 1;
    }
  }

  execFileSync("oxipng", ["-q", "-o", "max", "--strip", "safe", "-r", PNG_CANDIDATES], {
    stdio: "pipe"
  });

  let before = 0;
  let after = 0;
  for (const category of CATEGORIES) {
    for (const file of listPng(category)) {
      before += statSync(join(ROOT, "assets", category, file)).size;
      after += statSync(join(PNG_CANDIDATES, category, file)).size;
    }
  }

  console.log(`recompressed ${count} PNG files`);
  console.log(
    `size ${formatKb(before)} KB -> ${formatKb(after)} KB (${(((after - before) / before) * 100).toFixed(1)}%)`
  );
  console.log(`candidates: ${PNG_CANDIDATES}`);
}

if (isMainModule(import.meta.url)) main();
