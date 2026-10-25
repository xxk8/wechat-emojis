import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  CATEGORIES,
  ROOT,
  countByCategory,
  readEmojiSource,
  type EmojiEntry
} from "./lib/emoji-source.ts";
import { isMainModule } from "./lib/is-main.ts";

const errors: string[] = [];

function toPosix(filePath: string): string {
  return filePath.split(sep).join("/");
}

function listPngFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listPngFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      result.push(toPosix(relative(ROOT, fullPath)));
    }
  }
  return result;
}

function normalize(value: string): string {
  return value.normalize("NFC");
}

export function main(): void {
  const emojis: EmojiEntry[] = readEmojiSource();
  const registered = new Map<string, string>();

  for (const emoji of emojis) {
    const expectedPath = `assets/${emoji.category}/${emoji.name}.png`;
    if (emoji.path !== expectedPath) {
      errors.push(
        `路径与分类/名称不匹配：${emoji.name} -> ${emoji.path}（应为 ${expectedPath}）`
      );
    }
    if (registered.has(emoji.path)) {
      errors.push(`多个表情指向同一文件：${emoji.path}`);
    }
    registered.set(emoji.path, emoji.name);
  }

  const onDisk = listPngFiles(join(ROOT, "assets"));
  const onDiskSet = new Set(onDisk.map(normalize));

  for (const [file, name] of registered) {
    if (!onDiskSet.has(normalize(file))) {
      errors.push(`映射存在但文件缺失或大小写不一致：${name} -> ${file}`);
    }
  }

  for (const file of onDisk) {
    if (!registered.has(file) && !registered.has(normalize(file))) {
      errors.push(`图片存在但未登记：${file}`);
    }
  }

  const counts = countByCategory(emojis);
  console.log(`映射表情数：${emojis.length}`);
  console.log(`磁盘 PNG 数：${onDisk.length}`);
  for (const category of CATEGORIES) {
    console.log(`  ${category}: ${counts[category]}`);
  }

  if (errors.length > 0) {
    console.error("\n资源校验失败：");
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("\n资源校验通过。");
}

if (isMainModule(import.meta.url)) main();
