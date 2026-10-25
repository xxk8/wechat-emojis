/**
 * Shared constants and source parsing for the repository scripts.
 *
 * The emoji map is read from src/index.ts text rather than imported, because
 * that file uses a TypeScript `enum`, which Node's type stripping cannot run.
 */

import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SITE_URL = "https://xxk8.github.io/wechat-emojis";
export const WORK_DIR = join(ROOT, ".image-optimization");

export const CATEGORIES = ["face", "gesture", "animal", "blessing", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  face: "人脸",
  gesture: "手势",
  animal: "动物",
  blessing: "祝福",
  other: "其他"
};

export const CATEGORY_FULL_LABELS: Record<Category, string> = {
  face: "人脸表情",
  gesture: "手势表情",
  animal: "动物表情",
  blessing: "祝福表情",
  other: "其他表情"
};

export interface EmojiEntry {
  readonly key: string;
  readonly name: string;
  readonly category: Category;
  readonly path: string;
}

const ENTRY_PATTERN =
  /'([^']+)':\s*\{\s*name:\s*'([^']+)',\s*category:\s*EmojiCategory\.([A-Z]+),\s*path:\s*'([^']+)'/g;

export function readEmojiSource(): EmojiEntry[] {
  const source = readFileSync(join(ROOT, "src", "index.ts"), "utf8");
  const entries: EmojiEntry[] = [];
  for (const match of source.matchAll(ENTRY_PATTERN)) {
    const [, key, name, categoryKey, path] = match;
    if (!key || !name || !categoryKey || !path) continue;
    entries.push({
      key,
      name,
      category: categoryKey.toLowerCase() as Category,
      path
    });
  }
  return entries;
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function assetPath(category: Category, name: string): string {
  return join(ROOT, "assets", category, `${name}.png`);
}

export function assetSize(category: Category, name: string): number {
  return statSync(assetPath(category, name)).size;
}

export function readPngDimensions(path: string): { width: number; height: number } {
  const buffer = readFileSync(path);
  if (buffer.length < 24 || buffer.toString("latin1", 12, 16) !== "IHDR") {
    throw new Error(`Not a PNG (missing IHDR): ${path}`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

export function formatKb(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

export function countByCategory(entries: readonly EmojiEntry[]): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as Record<
    Category,
    number
  >;
  for (const entry of entries) counts[entry.category] += 1;
  return counts;
}
