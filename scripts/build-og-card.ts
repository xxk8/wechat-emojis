/**
 * The card is committed because crawlers fetch it directly, and it is generated
 * by hand because CI runners have no browser.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CATEGORIES,
  ROOT,
  countByCategory,
  formatKb,
  readEmojiSource,
  readPngDimensions
} from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
];

function findChrome(): string {
  const found = CHROME_PATHS.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      `No Chrome found. Install one of: ${CHROME_PATHS.join(", ")}, or regenerate site/og-card.png by hand.`
    );
  }
  return found;
}

function main(): void {
  const entries = readEmojiSource();
  const totalBytes = entries.reduce((sum, entry) => sum + readSize(entry.path), 0);
  const template = readFileSync(join(ROOT, "site", "og-card.template.html"), "utf8");
  const widths = new Set(
    entries.map((entry) => readPngDimensions(join(ROOT, entry.path)).width)
  );
  if (widths.size !== 1) {
    throw new Error(`Emoji images must share one width, found: ${[...widths].join(", ")}`);
  }
  const imageSize = [...widths][0] as number;

  const replacements: Record<string, string> = {
    "{{TOTAL_COUNT}}": String(entries.length),
    "{{TOTAL_KB}}": formatKb(totalBytes),
    "{{CATEGORY_COUNT}}": String(CATEGORIES.length),
    "{{FACE_COUNT}}": String(countByCategory(entries).face),
    "{{IMAGE_SIZE}}": `${imageSize}×${imageSize}`
  };
  let html = template
    .replaceAll('href="brand.css"', `href="file://${ROOT}/site/brand.css"`)
    .replaceAll('src="../assets/', `src="file://${ROOT}/assets/`);
  for (const [token, value] of Object.entries(replacements)) {
    html = html.replaceAll(token, value);
  }
  const leftovers = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftovers) throw new Error(`Unresolved card tokens: ${[...new Set(leftovers)].join(", ")}`);

  const work = mkdtempSync(join(tmpdir(), "we-og-"));
  try {
    const page = join(work, "card.html");
    const shot = join(work, "card.png");
    writeFileSync(page, html);
    execFileSync(
      findChrome(),
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        `--window-size=${CARD_WIDTH},${CARD_HEIGHT}`,
        `--screenshot=${shot}`,
        `file://${page}`
      ],
      { stdio: "pipe" }
    );
    execFileSync("cp", [shot, join(ROOT, "site", "og-card.png")]);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  console.log(`Built site/og-card.png at ${CARD_WIDTH}x${CARD_HEIGHT} with ${entries.length} emoji.`);
}

function readSize(path: string): number {
  return readFileSync(join(ROOT, path)).length;
}

if (isMainModule(import.meta.url)) main();
