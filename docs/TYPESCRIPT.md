# TypeScript 全量迁移说明

## 结果

仓库内已无任何手写的 `.js` / `.mjs` / `.cjs` 源文件。`src/`、`scripts/`、`site/app.ts` 全部为 TypeScript。

验证：

```
find scripts site -name '*.js' -o -name '*.mjs' -o -name '*.cjs'   → 空
git ls-files '*.js' '*.mjs' '*.cjs'                                → 空
```

## 迁移清单

| 原文件 | 现文件 | 说明 |
| --- | --- | --- |
| `scripts/prepare.js` | `scripts/prepare.ts` | 改为 ESM，逻辑不变 |
| `scripts/verify-assets.js` | `scripts/verify-assets.ts` | 不再依赖 `dist/index.js`，直接解析 `src/index.ts` |
| `scripts/build-site.mjs` | `scripts/build-site.ts` | 新增 `app.ts` 编译与内联 |
| `scripts/check-site.mjs` | `scripts/check-site.ts` | 全部断言保留 |
| `scripts/encode-candidates.mjs` | `scripts/encode-candidates.ts` | |
| `scripts/image-metrics.mjs` | `scripts/lib/image-metrics.ts` | 加入完整类型 |
| `scripts/measure-candidates.mjs` | `scripts/measure-candidates.ts` | |
| `scripts/image-report.mjs` | `scripts/image-report.ts` | |
| `scripts/render-review-sheet.mjs` | `scripts/render-review-sheet.ts` | |
| `scripts/apply-png-optimization.mjs` | `scripts/apply-png-optimization.ts` | |
| `scripts/optimize-images.mjs` | 删除 | 早期实验脚本，已被 `encode-candidates` + `measure-candidates` 取代 |
| `site/app.js` | `site/app.ts` | 编译后内联进 `index.html` |
| — | `scripts/lib/emoji-source.ts` | 新增：共享常量与 `src/index.ts` 解析 |
| — | `scripts/lib/is-main.ts` | 新增：入口检测 |

## 三个关键决策

### 1. 脚本不编译，直接由 Node 运行 `.ts`

`node scripts/build-site.ts` 直接执行。Node 22.6+ 的类型剥离会移除类型标注，不产出中间文件，所以仓库里不会出现编译后的 `.js`。

为此 `scripts/package.json` 声明了 `{"type": "module"}`，作用域仅限 `scripts/`，不影响已发布的 CommonJS 包。

### 2. 脚本不 import `src/index.ts`

`src/index.ts` 使用 TypeScript `enum`，而 Node 的类型剥离**不支持 `enum`**（会抛 `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`）。因此脚本改为解析 `src/index.ts` 的源码文本提取表情映射，见 `scripts/lib/emoji-source.ts`。

这个取舍的代价是：如果 `src/index.ts` 的条目格式大改，解析正则需要同步更新。`verify:assets` 会在格式不匹配时立即失败（109 条对不上），不会静默出错。

### 3. 浏览器脚本改为构建期内联

`site/app.ts` 由 esbuild 编译（`format: iife`、`minify`）后内联进 `index.html` 的 `<script>`。收益：

- 仓库里没有 `.js` 源文件
- 站点少一个网络请求（实测 `scriptRequests: 0`）
- 脚本随 HTML 一起缓存

代价是 `index.html` 变大（约 82 KB，其中内联脚本约 6 KB minified），并且修改 `app.ts` 后必须重新运行 `build:site`。

## 兼容性

| 场景 | Node 要求 | 说明 |
| --- | --- | --- |
| 使用已发布的 npm 包 | ≥ 14.0.0 | 不变，消费者只用 `dist/` 与 PNG |
| 运行本仓库脚本 | ≥ 22.6 | 需要类型剥离 |
| CI | 22.x / 24.x | 已从 20.x/22.x 上调 |

`package.json` 的 `engines` 保持 `>=14.0.0`，因为它是给消费者看的；构建期要求写在 README 与 CI 里。

## 新增依赖

| 依赖 | 用途 |
| --- | --- |
| `@types/node` | 脚本类型检查 |
| `esbuild` | 编译 `site/app.ts` |

两者都在 `devDependencies`，不影响发布包体积（`npm pack` 实测 116 个文件、758.2 kB，只含 `dist/`、`assets/`、文档与 README）。

## 新增配置

`tsconfig.scripts.json`：

- `module: nodenext` + `allowImportingTsExtensions`，允许 `.ts` 后缀导入
- `erasableSyntaxOnly`，禁止使用 Node 无法剥离的语法（如 `enum`）
- `noEmit`，只做类型检查
- `noUnusedLocals` / `noUnusedParameters`，防止遗留死代码

## 验证记录

```
npm test                  → 通过（build + typecheck:scripts + typecheck:examples + verify:assets + check:package）
npm run build:site        → Built index.html with 109 emoji, 690.3 KB of assets
npm run check:site        → OK (109 emoji, 690.3 KB, 109 tiles, 5 categories)
npm pack --dry-run        → 116 files, 759.8 kB，无 scripts/ 与 site/
```

浏览器回归（Chromium，内联脚本）：

| 项目 | 结果 |
| --- | --- |
| 表情墙 | 109 tiles |
| 轨道表情 | 12 |
| 破图 | 0 |
| 外部 JS 请求 | 0 |
| 搜索「笑」 | 7 个，仅 face 组 |
| 分类筛选（祝福） | 7 个 |
| 选中详情 | 名称/分类/路径正确 |
| 动效开关 | `aria-pressed=true`，动画 paused |
| 轨道点击 | 中央与详情同步为 OK |
| 复制 | 显示「已复制」 |
| 随机 | 选中 1 个并同步详情 |
| 移动端抽屉 | 打开/关闭正常，Escape 后焦点回到瓦片 |
| 减少动效 | `animation: none`，开关隐藏 |
| 控制台错误 | 0 |

## 注意事项

- 修改 `site/app.ts` 后必须运行 `npm run build:site`，否则 `index.html` 仍是旧脚本。
- CI 已加断言：`scripts/` 与 `site/` 下出现 `.js`/`.mjs`/`.cjs` 会失败。
- `dist/` 仍是编译产物（`.gitignore` 忽略），不属于手写源码。
