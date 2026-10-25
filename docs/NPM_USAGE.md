# 微信表情包 NPM 包使用指南

### 1. 安装包

```bash
npm install wechat-emojis
```

安装后直接用 `getEmojiUrl` 即可拿到可渲染的图片地址，不需要复制文件：

```tsx
import { getEmojiUrl } from 'wechat-emojis';

<img src={getEmojiUrl('旺柴')!} alt="旺柴" width={32} height={32} />
```

### 2. 在 React 项目中使用

#### 基础导入

```typescript
import {
  getEmojiPath,
  getEmojiUrl,
  getEmojisByCategory,
  EmojiCategory,
  searchEmojis,
  getRandomEmoji,
  type EmojiName
} from 'wechat-emojis';
```

#### 创建表情组件

```tsx
// components/WeChatEmoji.tsx
import React from 'react';
import { getEmojiPath, type EmojiName } from 'wechat-emojis';

interface WeChatEmojiProps {
  name: EmojiName;
  size?: number;
  className?: string;
}

const WeChatEmoji: React.FC<WeChatEmojiProps> = ({
  name,
  size = 24,
  className = ''
}) => {
  const emojiPath = getEmojiPath(name);

  if (!emojiPath) {
    return null;
  }

  return (
    <img
      src={emojiPath}
      alt={name}
      width={size}
      height={size}
      className={`wechat-emoji ${className}`}
    />
  );
};

export default WeChatEmoji;
```

#### 使用示例

```tsx
// App.tsx
import React from 'react';
import WeChatEmoji from './components/WeChatEmoji';
import { getEmojisByCategory, EmojiCategory } from 'wechat-emojis';

function App() {
  const faceEmojis = getEmojisByCategory(EmojiCategory.FACE);

  return (
    <div>
      <h1>微信表情包示例</h1>

      {/* 单个表情 */}
      <WeChatEmoji name="微笑" size={32} />
      <WeChatEmoji name="大哭" size={32} />

      {/* 表情列表 */}
      <div>
        {faceEmojis.slice(0, 10).map(emoji => (
          <WeChatEmoji key={emoji} name={emoji} size={24} />
        ))}
      </div>
    </div>
  );
}

export default App;
```

### 3. 处理静态资源

由于表情图片是静态资源，你有两种选择。

#### 默认：用 `getEmojiUrl` 直接引用 jsDelivr 上的图片

```tsx
import { getEmojiUrl } from 'wechat-emojis';

const url = getEmojiUrl('旺柴');
// https://cdn.jsdelivr.net/npm/wechat-emojis@2/assets/face/%E6%97%BA%E6%9F%B4.png
```

无需任何复制步骤，也不占用你的构建产物。

#### 可选：自托管（不想依赖 CDN 时）

将表情图片复制到项目的 public 目录，并改用 `getEmojiPath`：

##### 方法一：手动复制

```bash
# 创建资源目录
mkdir -p public/assets

# 复制资源文件
cp -r node_modules/wechat-emojis/assets/* public/assets/
```

#### 方法二：使用构建脚本

在你的 `package.json` 中添加：

```json
{
  "scripts": {
    "postinstall": "mkdir -p public/assets && cp -r node_modules/wechat-emojis/assets/* public/assets/",
    "build": "npm run copy-assets && react-scripts build",
    "copy-assets": "mkdir -p public/assets && cp -r node_modules/wechat-emojis/assets/* public/assets/"
  }
}
```

#### 方法三：使用 webpack 配置

如果你使用自定义 webpack 配置，可以添加：

```javascript
// webpack.config.js
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/wechat-emojis/assets',
          to: 'assets'
        }
      ]
    })
  ]
};
```

## 🔧 TypeScript 支持

包已包含完整的 TypeScript 类型定义，你可以享受完整的类型检查和智能提示：

```typescript
import { EmojiName, EmojiCategory } from 'wechat-emojis';

// 类型安全的表情名称
const emojiName: EmojiName = '微笑'; // ✅ 正确
const invalidName: EmojiName = '不存在的表情'; // ❌ TypeScript 错误

// 枚举类型
const category: EmojiCategory = EmojiCategory.FACE;
```

## 📱 在其他框架中使用

### Vue.js

```vue
<template>
  <div>
    <img :src="getEmojiPath('微笑')" alt="微笑" width="24" height="24" />
  </div>
</template>

<script>
import { getEmojiPath } from 'wechat-emojis';

export default {
  methods: {
    getEmojiPath
  }
};
</script>
```

### Angular

```typescript
// emoji.service.ts
import { Injectable } from '@angular/core';
import { getEmojiPath, getEmojisByCategory, EmojiCategory } from 'wechat-emojis';

@Injectable({
  providedIn: 'root'
})
export class EmojiService {
  getEmojiPath = getEmojiPath;
  getEmojisByCategory = getEmojisByCategory;
  EmojiCategory = EmojiCategory;
}
```

```html
<!-- emoji.component.html -->
<img [src]="emojiService.getEmojiPath('微笑')" alt="微笑" width="24" height="24">
```

## 🎯 最佳实践

1. **预加载常用表情**：在应用启动时预加载常用表情图片
2. **懒加载**：对于大量表情，考虑使用懒加载
3. **缓存**：利用浏览器缓存机制，避免重复加载
4. **错误处理**：始终检查 `getEmojiPath` 的返回值
5. **性能优化**：使用 `React.memo` 或类似优化手段避免不必要的重渲染

## 🐛 常见问题

### Q: 表情图片显示不出来？

A: 确保已将 assets 目录复制到项目的 public 目录中。

### Q: TypeScript 类型错误？

A: 确保安装了最新版本的包，并重启 TypeScript 服务。

### Q: 如何自定义表情路径？

A: 你可以修改返回的路径，或者将图片复制到自定义目录。
