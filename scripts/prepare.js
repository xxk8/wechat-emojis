#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const tscBin = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');

// 没有 devDependencies 时（如 npm ci --omit=dev）跳过构建，否则安装会以 127 失败。
if (!fs.existsSync(tscBin)) {
  console.log('未安装 typescript，跳过构建。');
  process.exit(0);
}

const result = spawnSync(process.execPath, [tscBin], { cwd: rootDir, stdio: 'inherit' });
process.exit(result.status === null ? 1 : result.status);
