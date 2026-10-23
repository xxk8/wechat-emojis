# 微信表情包

完整的微信内置表情资源库，包含 109 个高清 PNG 图片和类型安全的 TypeScript API。

## 功能特性

- 🎯 **完整收录** - 109 个微信内置表情，按类别组织
- 🔧 **TypeScript 支持** - 完整类型定义，编译时错误检查
- 🚀 **即插即用** - 支持 React、Vue、Angular 等主流框架
- 📦 **多种导入方式** - ES6 模块、CommonJS、直接文件引用
- 🔍 **强大 API** - 搜索、分类、随机获取等功能
- 📱 **高质量图片** - PNG 格式，适合各种显示场景
- 📚 **详细文档** - 完整 API 文档和使用示例

## 快速开始

### 安装使用

#### 通过 NPM 安装（推荐）

```bash
# 使用 npm 安装
npm install wechat-emojis

# 复制表情资源到项目的 public 目录（重要）
mkdir -p public/assets
cp -r node_modules/wechat-emojis/assets/* public/assets/
```

### 基础用法

```typescript
// 使用 NPM 安装的情况
import { getEmojiPath, getEmojisByCategory, EmojiCategory, searchEmojis } from 'wechat-emojis';

// 或者从本地导入
// import { getEmojiPath, getEmojisByCategory, EmojiCategory, searchEmojis } from './src';

// 获取单个表情
const smilePath = getEmojiPath('微笑');  // 'assets/face/微笑.png'

// 获取分类表情
const faceEmojis = getEmojisByCategory(EmojiCategory.FACE);  // 75个人脸表情

// 搜索表情
const laughEmojis = searchEmojis('笑');  // 包含"笑"的所有表情
```

## 项目结构

```text
wechat-emojis/
├── src/
│   └── index.ts        # TypeScript API模块（源码）
├── dist/               # 构建产物（npm run build 生成，含 index.js 和 index.d.ts）
├── assets/             # 表情图片资源 (109个PNG文件)
│   ├── face/          # 人脸表情 (75个)
│   ├── gesture/       # 手势表情 (10个)
│   ├── animal/        # 动物表情 (4个)
│   ├── blessing/      # 祝福表情 (7个)
│   └── other/         # 其他表情 (13个)
├── examples/           # 使用示例（TypeScript 和 React）
├── docs/               # API.md、REACT_USAGE.md、NPM_USAGE.md
├── scripts/            # 资源完整性校验脚本
└── tsconfig.json       # TypeScript配置
```

## 使用指南

### React 组件

```tsx
import React from 'react';
import { getEmojiPath, getEmojisByCategory, EmojiCategory } from 'wechat-emojis';

const EmojiPicker: React.FC = () => {
  const faceEmojis = getEmojisByCategory(EmojiCategory.FACE);

  return (
    <div className="emoji-grid">
      {faceEmojis.map(emoji => (
        <img
          key={emoji.name}
          src={getEmojiPath(emoji.name)}
          alt={emoji.name}
          className="emoji-item"
          onClick={() => console.log(`选择: ${emoji.name}`)}
        />
      ))}
    </div>
  );
};
```

### Vue 组件

```vue
<template>
  <div class="emoji-picker">
    <img
      v-for="emoji in emojis"
      :key="emoji.name"
      :src="getEmojiPath(emoji.name)"
      :alt="emoji.name"
      @click="selectEmoji(emoji)"
    />
  </div>
</template>

<script setup lang="ts">
import { getEmojisByCategory, getEmojiPath, EmojiCategory } from 'wechat-emojis';

const emojis = getEmojisByCategory(EmojiCategory.FACE);
const selectEmoji = (emoji) => console.log(`选择: ${emoji.name}`);
</script>
```

### 原生 JavaScript

```javascript
// NPM 包使用
const { getEmojiPath, EmojiCategory, searchEmojis } = require('wechat-emojis');

// 创建表情选择器
function createEmojiPicker(containerId) {
  const container = document.getElementById(containerId);
  const emojis = searchEmojis('笑');

  emojis.forEach(emoji => {
    const img = document.createElement('img');
    img.src = getEmojiPath(emoji.name);
    img.alt = emoji.name;
    img.onclick = () => console.log(`选择: ${emoji.name}`);
    container.appendChild(img);
  });
}
```

### 直接使用图片

```html
<!-- 直接引用图片文件 -->
<img src="assets/face/微笑.png" alt="微笑" />
<img src="assets/gesture/OK.png" alt="OK" />
<img src="assets/animal/猪头.png" alt="猪头" />
```

## API 参考

### 核心函数

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getEmojiPath(name)` | `EmojiName` | `string \| null` | 获取表情图片路径 |
| `getEmojiInfo(name)` | `EmojiName` | `EmojiInfo \| null` | 获取表情详细信息 |
| `getEmojisByCategory(category)` | `EmojiCategory` | `EmojiInfo[]` | 按类别获取表情列表 |
| `getAllEmojis()` | - | `EmojiInfo[]` | 获取所有表情 |
| `searchEmojis(keyword)` | `string` | `EmojiInfo[]` | 搜索包含关键词的表情 |
| `hasEmoji(name)` | `string` | `boolean` | 检查表情是否存在 |
| `getRandomEmoji(category?)` | `EmojiCategory?` | `EmojiInfo` | 随机获取表情 |

### 类型定义

```typescript
enum EmojiCategory {
  FACE = 'face',      // 人脸表情
  GESTURE = 'gesture', // 手势表情
  ANIMAL = 'animal',   // 动物表情
  BLESSING = 'blessing', // 祝福表情
  OTHER = 'other'      // 其他表情
}

interface EmojiInfo {
  name: string;           // 表情名称
  category: EmojiCategory; // 表情类别
  path: string;           // 图片路径
}
```

## 数据统计

| 类别 | 数量 | 示例 |
|------|------|------|
| 人脸表情 | 75个 | 微笑、大哭、呲牙、捂脸、奸笑、加油 |
| 手势表情 | 10个 | OK、握手、胜利、抱拳、合十、强、弱 |
| 动物表情 | 4个 | 猪头、跳跳、发抖、转圈 |
| 祝福表情 | 7个 | 庆祝、红包、烟花、爆竹 |
| 其他表情 | 13个 | 爱心、啤酒、蛋糕、太阳、炸弹 |
| **总计** | **109个** | 完整覆盖微信内置表情 |

## 技术要求

- **TypeScript**: 4.0+ (可选，用于类型检查)
- **Node.js**: 12+ (用于编译，可选)
- **浏览器**: 支持 ES2017+ 的现代浏览器
- **框架**: React 16+, Vue 3+, Angular 12+ 或原生 JavaScript

## 编译和构建

```bash
# 编译到 dist/（同时生成 index.d.ts）
npm run build

# 仅做类型检查
npm run typecheck

# 构建并校验 assets 与表情映射是否一致
npm test
```

## 常见问题

**Q: 如何在 Webpack 项目中使用？**

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  }
};
```

**Q: 如何自定义表情路径？**

```typescript
const customPath = getEmojiPath('微笑')?.replace('assets/', 'my-assets/');
```

**Q: 支持哪些图片格式？**
所有表情均为 PNG 格式，透明背景，适合各种使用场景。

## 版权声明

- 本项目为非官方项目，与腾讯公司及微信团队无关
- 表情图片版权归腾讯公司所有
- 本项目仅供个人学习和非商业用途使用
- 任何商业用途请事先获得腾讯公司的授权
- 如有侵权问题，请联系作者删除

## 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。

# wechat-emojis

# 请我喝杯茶 | buy me a cup of tea

<div style="display: flex; justify-content: center; gap: 20px;">
  <img src="docs/images/alipay.png" alt="支付宝" width="300" />
  <img src="docs/images/wechat.png" alt="微信" width="300" />
</div>
