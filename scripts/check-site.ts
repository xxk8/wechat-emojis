import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ROOT,
  SITE_URL,
  countByCategory,
  formatKb,
  readEmojiSource,
  readPngDimensions,
  type Category
} from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

const problems: string[] = [];

function fail(message: string): void {
  problems.push(message);
}

function checkAssets(entries: ReturnType<typeof readEmojiSource>): void {
  if (entries.length !== 109) fail(`Expected 109 emoji in src/index.ts, found ${entries.length}`);

  const names = new Set<string>();
  for (const entry of entries) {
    if (names.has(entry.name)) fail(`Duplicate emoji name: ${entry.name}`);
    names.add(entry.name);
    const file = join(ROOT, entry.path);
    if (!existsSync(file)) {
      fail(`Missing asset: ${entry.path}`);
      continue;
    }
    if (statSync(file).size === 0) fail(`Empty asset: ${entry.path}`);
    const { width, height } = readPngDimensions(file);
    if (width !== 100 || height !== 100) {
      fail(`${entry.name} is ${width}x${height}, expected 100x100`);
    }
    const categoryDir = entry.path.split("/")[1];
    if (categoryDir !== entry.category) {
      fail(`Category/path mismatch for ${entry.name}: ${entry.category} vs ${entry.path}`);
    }
  }

  for (const category of CATEGORIES) {
    const files = readdirSync(join(ROOT, "assets", category)).filter((file) =>
      file.endsWith(".png")
    );
    const mapped = entries.filter((entry) => entry.category === category).length;
    if (files.length !== mapped) {
      fail(`assets/${category} has ${files.length} PNG files but the source maps ${mapped}`);
    }
  }
}

function checkHtml(entries: ReturnType<typeof readEmojiSource>): { tiles: number; totalKb: string } {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  const template = readFileSync(join(ROOT, "site", "index.template.html"), "utf8");

  const referenced = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)]
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value));
  for (const asset of new Set(referenced)) {
    const decoded = decodeURIComponent(asset);
    if (!existsSync(join(ROOT, decoded))) fail(`index.html references missing asset: ${asset}`);
  }

  const tiles = [...html.matchAll(/class="we-emoji-tile" type="button" data-emoji="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value));
  if (tiles.length !== entries.length) {
    fail(`Wall renders ${tiles.length} tiles, source has ${entries.length}`);
  }
  if (new Set(tiles).size !== tiles.length) fail("Wall contains duplicate tiles");
  for (const entry of entries) {
    if (!tiles.includes(entry.name)) fail(`Wall is missing ${entry.name}`);
  }

  const dataMatch = html.match(/<script type="application\/json" id="emoji-data">([\s\S]*?)<\/script>/);
  if (!dataMatch) {
    fail("Missing inline emoji data block");
  } else {
    try {
      const parsed = JSON.parse(dataMatch[1] ?? "") as unknown[];
      if (parsed.length !== entries.length) {
        fail(`Inline data has ${parsed.length} entries, source has ${entries.length}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fail(`Inline emoji data is not valid JSON: ${message}`);
    }
  }

  const counts = countByCategory(entries);
  const tableRows = html.match(/<tr><th scope="row"><code>([^<]+)<\/code>/g) ?? [];
  if (tableRows.length !== 9) fail(`API table should list 9 functions, found ${tableRows.length}`);
  if (!html.includes("<code>getEmojiUrl(name)</code>")) {
    fail("API table does not list getEmojiUrl");
  }

  const version = (
    JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version?: string }
  ).version;
  if (!version) fail("package.json is missing a version");
  else if (!html.includes(`wechat-emojis ${version} 的公开函数`)) {
    fail(`Page does not state the package version ${version}`);
  }

  const totalBytes = entries.reduce((sum, entry) => sum + statSync(join(ROOT, entry.path)).size, 0);
  const totalKb = formatKb(totalBytes);
  if (!html.includes(`${totalKb} KB`)) fail(`Page does not state the measured total ${totalKb} KB`);
  if (!html.includes(`${entries.length} 个`)) fail("Page does not state the total count");
  if (!html.includes(`wechat-emojis · ${entries.length} 个`)) {
    fail("Page title does not state the total count");
  }

  const averageKb = (totalBytes / entries.length / 1024).toFixed(2);
  if (!html.includes(`${averageKb} KB`)) {
    fail(`Page does not state the measured average ${averageKb} KB`);
  }

  const byteSizes = entries.map((entry) => statSync(join(ROOT, entry.path)).size);
  const smallestKb = formatKb(Math.min(...byteSizes));
  const largestKb = formatKb(Math.max(...byteSizes));
  if (!html.includes(`${smallestKb} KB`) || !html.includes(`${largestKb} KB`)) {
    fail(`Page does not state the measured size range ${smallestKb}-${largestKb} KB`);
  }

  const dimensions = new Set(
    entries.map((entry) => {
      const { width, height } = readPngDimensions(join(ROOT, entry.path));
      return `${width}×${height}`;
    })
  );
  if (dimensions.size !== 1) {
    fail(`Emoji images do not share one size: ${[...dimensions].join(", ")}`);
  } else {
    const [size] = [...dimensions] as [string];
    const [width, height] = size.split("×");
    if (!html.includes(size) || !html.includes(`${width} × ${height}`)) {
      fail(`Page does not state the measured ${size} image size`);
    }
  }

  for (const category of CATEGORIES) {
    const label = CATEGORY_LABELS[category];
    if (!html.includes(`${label} <span class="we-chip-count">${counts[category]}</span>`)) {
      fail(`Filter for ${label} does not show ${counts[category]}`);
    }
    const labelMarkup = `<span class="we-custom-bar-label">${label}</span>`;
    const barStart = html.indexOf(labelMarkup);
    if (barStart === -1) {
      fail(`Ledger has no bar row for ${label}`);
      continue;
    }
    const bytes = entries
      .filter((entry) => entry.category === category)
      .reduce((sum, entry) => sum + statSync(join(ROOT, entry.path)).size, 0);
    if (!html.slice(barStart, barStart + 400).includes(`${formatKb(bytes)} KB`)) {
      fail(`Ledger bar for ${label} does not show the measured ${formatKb(bytes)} KB`);
    }
  }

  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if (!ogImage) {
    fail("Page is missing og:image");
  } else if (!ogImage.startsWith(SITE_URL)) {
    fail(`og:image is not absolute: ${ogImage}`);
  } else {
    const localPath = ogImage.slice(SITE_URL.length + 1);
    const card = join(ROOT, decodeURIComponent(localPath));
    if (!existsSync(card)) {
      fail(`og:image file is missing: ${localPath}`);
    } else {
      const { width, height } = readPngDimensions(card);
      if (width !== 1200 || height !== 630) {
        fail(`og:image is ${width}x${height}, expected 1200x630`);
      }
    }
  }
  if (!html.includes('<meta name="twitter:card" content="summary_large_image">')) {
    fail("Page should use a large Twitter card");
  }

  if (/\{\{[A-Z_]+\}\}/.test(html)) fail("index.html still contains unresolved template tokens");
  if (/\{\{[A-Z_]+\}\}/.test(template.replace(/\{\{[A-Z_]+\}\}/g, ""))) {
    fail("Template has stray tokens");
  }

  const externalAssets = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value))
    .filter(
      (url) =>
        !url.startsWith(SITE_URL) &&
        !url.startsWith("https://github.com/") &&
        !url.startsWith("https://www.npmjs.com/")
    );
  if (externalAssets.length > 0) fail(`Page loads third-party assets: ${externalAssets.join(", ")}`);

  if (!html.includes('lang="zh-CN"')) fail("Page is missing a Chinese lang attribute");
  if (!html.includes('name="viewport"')) fail("Page is missing a viewport meta tag");
  if ((html.match(/<h1\b/g) ?? []).length !== 1) fail("Page must contain exactly one h1");
  if (!html.includes('class="we-skip" href="#main"')) fail("Page is missing a skip link");
  if (!html.includes('<main id="main">')) fail("Page is missing the main landmark");
  if (!html.includes('href="#wall"')) fail("Page is missing the primary wall link");
  if (html.includes("—")) fail("Page copy contains an em dash");

  const forbidden = ["一站式", "赋能", "极致", "颠覆", "官方收录", "100% 官方"];
  for (const phrase of forbidden) {
    if (html.includes(phrase)) fail(`Page copy contains a forbidden claim: ${phrase}`);
  }
  if (!html.includes("非官方项目")) fail("Page is missing the unofficial caveat");

  return { tiles: tiles.length, totalKb };
}

export function main(): void {
  const entries = readEmojiSource();
  checkAssets(entries);
  const { tiles, totalKb } = checkHtml(entries);

  const design = readFileSync(join(ROOT, "design.md"), "utf8");
  if (!design.includes(SITE_URL)) fail("design.md does not name the published site URL");

  if (problems.length > 0) {
    console.error(`check-site: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
    return;
  }

  const categories: readonly Category[] = CATEGORIES;
  console.log(
    `check-site: OK (${entries.length} emoji, ${totalKb} KB, ${tiles} tiles, ${categories.length} categories)`
  );
}

if (isMainModule(import.meta.url)) main();
