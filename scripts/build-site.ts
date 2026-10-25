import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { transformSync } from "esbuild";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ROOT,
  SITE_URL,
  formatKb,
  readEmojiSource,
  readPngDimensions,
  type Category,
  type EmojiEntry
} from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

type Sizes = Record<string, number>;

function readSizes(entries: readonly EmojiEntry[]): Sizes {
  const sizes: Sizes = {};
  for (const entry of entries) sizes[entry.path] = statSync(join(ROOT, entry.path)).size;
  return sizes;
}

function compileBrowserScript(): string {
  const source = readFileSync(join(ROOT, "site", "app.ts"), "utf8");
  const result = transformSync(source, {
    loader: "ts",
    target: "es2019",
    minify: true,
    format: "iife"
  });
  return result.code.trim();
}

function readVersion(): string {
  const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    version?: string;
  };
  if (!manifest.version) throw new Error("package.json is missing a version");
  return manifest.version;
}

function readImageSize(entries: readonly EmojiEntry[]): number {
  const sizes = new Set(entries.map((entry) => readPngDimensions(join(ROOT, entry.path)).width));
  if (sizes.size !== 1) {
    throw new Error(`Emoji images must share one width, found: ${[...sizes].join(", ")}`);
  }
  return [...sizes][0] as number;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderOrbit(entries: readonly EmojiEntry[], names: readonly string[]): string {
  return names
    .map((name, index) => {
      const emoji = entries.find((item) => item.name === name);
      if (!emoji) throw new Error(`Unknown orbit emoji: ${name}`);
      const angle = (360 / names.length) * index;
      return `              <span class="we-orbit-slot" style="--a:${angle}deg">
                <button class="we-orbit-item" type="button" data-emoji="${escapeHtml(emoji.name)}" aria-label="查看 ${escapeHtml(emoji.name)}">
                  <span class="we-orbit-item-inner"><img src="${emoji.path}" alt="" width="46" height="46" loading="lazy" decoding="async"></span>
                </button>
              </span>`;
    })
    .join("\n");
}

function countByCategory(entries: readonly EmojiEntry[]): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as Record<
    Category,
    number
  >;
  for (const entry of entries) counts[entry.category] += 1;
  return counts;
}

function renderFilters(entries: readonly EmojiEntry[]): string {
  const counts = countByCategory(entries);
  const all = `<button class="we-chip" type="button" data-filter="all" aria-pressed="true">全部 <span class="we-chip-count">${entries.length}</span></button>`;
  const rest = CATEGORIES.map(
    (category) =>
      `<button class="we-chip" type="button" data-filter="${category}" aria-pressed="false">${CATEGORY_LABELS[category]} <span class="we-chip-count">${counts[category]}</span></button>`
  ).join("\n            ");
  return `${all}\n            ${rest}`;
}

function renderRail(entries: readonly EmojiEntry[]): string {
  const counts = countByCategory(entries);
  return CATEGORIES.map(
    (category) =>
      `<a class="we-custom-rail-link" href="#group-${category}"><span>${CATEGORY_LABELS[category]}</span><span class="we-mono">${counts[category]}</span></a>`
  ).join("\n        ");
}

function renderWall(entries: readonly EmojiEntry[]): string {
  const groups = CATEGORIES.map((category) => {
    const items = entries.filter((entry) => entry.category === category);
    const tiles = items
      .map(
        (emoji) => `            <li>
              <button class="we-emoji-tile" type="button" data-emoji="${escapeHtml(emoji.name)}" data-category="${emoji.category}" aria-pressed="false" aria-label="${escapeHtml(emoji.name)}，${CATEGORY_LABELS[emoji.category]}">
                <img src="${emoji.path}" alt="" width="54" height="54" loading="lazy" decoding="async">
                <span class="we-emoji-name">${escapeHtml(emoji.name)}</span>
              </button>
            </li>`
      )
      .join("\n");
    return `        <section class="we-custom-group" data-group="${category}" aria-labelledby="group-${category}">
          <div class="we-custom-group-head">
            <h3 class="we-heading" id="group-${category}">${CATEGORY_LABELS[category]}</h3>
            <span class="we-caption"><span class="we-mono">${items.length}</span> 个</span>
          </div>
          <ul class="we-custom-grid">
${tiles}
          </ul>
        </section>`;
  });
  return groups.join("\n");
}

function renderBars(entries: readonly EmojiEntry[], sizes: Sizes): string {
  const byCategory = CATEGORIES.map((category) => {
    const items = entries.filter((entry) => entry.category === category);
    const bytes = items.reduce((sum, entry) => sum + (sizes[entry.path] as number), 0);
    return { category, count: items.length, bytes };
  });
  const max = Math.max(...byCategory.map((entry) => entry.bytes));
  const total = byCategory.reduce((sum, entry) => sum + entry.bytes, 0);
  return byCategory
    .map(({ category, count, bytes }) => {
      const width = ((bytes / max) * 100).toFixed(2);
      const share = ((bytes / total) * 100).toFixed(1);
      return `          <div class="we-custom-bar-row">
            <span class="we-custom-bar-label">${CATEGORY_LABELS[category]}</span>
            <span class="we-custom-bar-track"><span class="we-custom-bar-fill" style="--fill:${width}%"></span></span>
            <span class="we-custom-bar-value we-mono">${formatKb(bytes)} KB</span>
            <span class="we-custom-bar-share we-mono">${share}% · ${count} 个</span>
          </div>`;
    })
    .join("\n");
}

export function main(): void {
  const entries = readEmojiSource();
  const sizes = readSizes(entries);
  const template = readFileSync(join(ROOT, "site", "index.template.html"), "utf8");
  const totalBytes = entries.reduce((sum, entry) => sum + (sizes[entry.path] as number), 0);
  const imageSize = readImageSize(entries);
  const featured = entries.find((entry) => entry.name === "旺柴") ?? entries[0];
  if (!featured) throw new Error("No emoji available to feature");

  const orbitOuter = ["旺柴", "捂脸", "吃瓜", "裂开", "OK", "福", "爱心", "庆祝"];
  const orbitInner = ["旺柴", "偷笑", "加油", "红包"];
  const missing = [...orbitOuter, ...orbitInner].filter(
    (name) => !entries.some((entry) => entry.name === name)
  );
  if (missing.length > 0) throw new Error(`Missing orbit emoji: ${missing.join(", ")}`);

  const replacements: Record<string, string> = {
    "{{SITE_URL}}": SITE_URL,
    "{{OG_IMAGE}}": `${SITE_URL}/${encodeURI(featured.path)}`,
    "{{TOTAL_COUNT}}": String(entries.length),
    "{{CATEGORY_COUNT}}": String(CATEGORIES.length),
    "{{TOTAL_KB}}": formatKb(totalBytes),
    "{{AVERAGE_KB}}": (totalBytes / entries.length / 1024).toFixed(2),
    "{{FACE_COUNT}}": String(countByCategory(entries).face),
    "{{SMALLEST_KB}}": (Math.min(...Object.values(sizes)) / 1024).toFixed(1),
    "{{LARGEST_KB}}": (Math.max(...Object.values(sizes)) / 1024).toFixed(1),
    "{{IMAGE_SIZE}}": `${imageSize}×${imageSize}`,
    "{{IMAGE_SIZE_SPACED}}": `${imageSize} × ${imageSize}`,
    "{{VERSION}}": readVersion(),
    "{{FEATURED_PATH}}": featured.path,
    "{{FEATURED_PATH_RAW}}": featured.path,
    "{{FEATURED_NAME}}": escapeHtml(featured.name),
    "{{FEATURED_CATEGORY}}": CATEGORY_LABELS[featured.category],
    "{{ORBIT_OUTER}}": renderOrbit(entries, orbitOuter),
    "{{ORBIT_INNER}}": renderOrbit(entries, orbitInner),
    "{{FILTERS}}": renderFilters(entries),
    "{{CATEGORY_RAIL}}": renderRail(entries),
    "{{WALL}}": renderWall(entries),
    "{{BARS}}": renderBars(entries, sizes),
    "{{EMOJI_DATA}}": JSON.stringify(
      entries.map((entry) => ({ name: entry.name, category: entry.category, path: entry.path }))
    ).replaceAll("</", "<\\/"),
    "{{APP_SCRIPT}}": compileBrowserScript().replaceAll("</script", "<\\/script")
  };

  let html = template;
  for (const [token, value] of Object.entries(replacements)) {
    html = html.replaceAll(token, value);
  }
  const leftovers = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftovers) throw new Error(`Unresolved template tokens: ${[...new Set(leftovers)].join(", ")}`);

  writeFileSync(join(ROOT, "index.html"), html);
  console.log(`Built index.html with ${entries.length} emoji, ${formatKb(totalBytes)} KB of assets.`);
}

if (isMainModule(import.meta.url)) main();
