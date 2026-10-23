#!/usr/bin/env node
/**
 * 校验表情资源与代码映射的一致性。
 * 依赖构建产物 dist/index.js，请在 npm run build 之后运行。
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');
const entryFile = path.join(rootDir, 'dist', 'index.js');

if (!fs.existsSync(entryFile)) {
  console.error('未找到 dist/index.js，请先运行 npm run build。');
  process.exit(1);
}

const { getAllEmojis, EmojiCategory } = require(entryFile);

const errors = [];
const normalize = (value) => value.normalize('NFC');

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function listPngFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listPngFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      result.push(toPosix(path.relative(rootDir, fullPath)));
    }
  }
  return result;
}

const emojis = getAllEmojis();
const registered = new Map();

for (const emoji of emojis) {
  const expectedPath = `assets/${emoji.category}/${emoji.name}.png`;
  if (emoji.path !== expectedPath) {
    errors.push(`路径与分类/名称不匹配：${emoji.name} -> ${emoji.path}（应为 ${expectedPath}）`);
  }
  if (registered.has(emoji.path)) {
    errors.push(`多个表情指向同一文件：${emoji.path}`);
  }
  registered.set(emoji.path, emoji.name);
}

const onDisk = listPngFiles(assetsDir);
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

const counts = {};
for (const category of Object.values(EmojiCategory)) {
  counts[category] = emojis.filter((emoji) => emoji.category === category).length;
}

console.log(`映射表情数：${emojis.length}`);
console.log(`磁盘 PNG 数：${onDisk.length}`);
for (const [category, count] of Object.entries(counts)) {
  console.log(`  ${category}: ${count}`);
}

if (errors.length > 0) {
  console.error('\n资源校验失败：');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('\n资源校验通过。');
