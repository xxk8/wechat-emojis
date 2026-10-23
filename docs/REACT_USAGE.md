# React 项目中使用微信表情包

本指南详细介绍如何在React项目中集成和使用微信表情包模块。

## 📦 安装和配置

### 方式一：使用npm包（推荐）

1. **安装包**：

```bash
npm install wechat-emojis
```

2. **复制资源文件**：
由于npm包中的图片资源需要被复制到你的项目public目录，请执行以下命令：

```bash
# 复制表情资源到你的项目
cp -r node_modules/wechat-emojis/assets/* public/assets/
```

你也可以在 `package.json` 中配置一个脚本，在安装后自动完成复制：

```json
// package.json
{
  "scripts": {
    "postinstall": "cp -r node_modules/wechat-emojis/assets/* public/assets/"
  }
}
```

3. **在React项目中使用**：

```typescript
// 直接从npm包导入
import {
  getEmojiPath,
  getEmojisByCategory,
  EmojiCategory,
  type EmojiName
} from 'wechat-emojis';

// 使用示例
const WeChatEmoji: React.FC<{name: EmojiName}> = ({ name }) => {
  const emojiPath = getEmojiPath(name);
  // 确保你的 public 目录配置正确，可以直接访问 /assets/
  return <img src={`/${emojiPath}`} alt={name} width={24} height={24} />;
};
```

### 方式二：直接复制文件

1. **复制必要文件到React项目**：
```bash
# 在你的React项目根目录下
mkdir -p src/utils/wechat-emojis
mkdir -p public/assets

# 复制构建产物（npm 包内不含 src/，克隆仓库时可用 path/to/dist/index.js）
cp path/to/dist/index.js src/utils/wechat-emojis/

# 复制表情资源到public目录
cp -r path/to/assets/* public/assets/
```

2. **调整图片路径**（重要）：
由于React项目中public目录的资源访问方式，需要修改 `src/index.ts` 中的图片路径，将所有 `'assets/'` 替换为 `'/assets/'`。使用 npm 包时无需修改，包内的路径是 `assets/...`，直接拼到 `/` 后面即可（如上面的 `/${emojiPath}`）。


## 🚀 基础使用

### 1. 导入模块

```typescript
// 从 npm 包导入 (推荐)
import {
  getEmojiPath,
  getEmojisByCategory,
  EmojiCategory,
  type EmojiName
} from 'wechat-emojis';
```

### 2. 创建表情组件

```tsx
// src/components/WeChatEmoji.tsx
import React from 'react';
import { getEmojiPath, type EmojiName } from 'wechat-emojis';

interface WeChatEmojiProps {
  name: EmojiName;
  size?: number;
  className?: string;
  alt?: string;
}

const WeChatEmoji: React.FC<WeChatEmojiProps> = ({
  name,
  size = 24,
  className = '',
  alt
}) => {
  const emojiPath = getEmojiPath(name);

  if (!emojiPath) {
    console.warn(`表情 "${name}" 不存在`);
    return null;
  }

  return (
    <img
      src={emojiPath}
      alt={alt || name}
      width={size}
      height={size}
      className={`wechat-emoji ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle'
      }}
    />
  );
};

export default WeChatEmoji;
```

### 3. 使用表情组件

```tsx
// src/App.tsx
import React from 'react';
import WeChatEmoji from './components/WeChatEmoji';

function App() {
  return (
    <div className="App">
      <h1>微信表情示例</h1>

      {/* 基础使用 */}
      <p>
        你好 <WeChatEmoji name="微笑" size={20} />
        今天天气真好 <WeChatEmoji name="太阳" size={20} />
      </p>

      {/* 不同尺寸 */}
      <div>
        <WeChatEmoji name="大哭" size={16} />
        <WeChatEmoji name="大哭" size={24} />
        <WeChatEmoji name="大哭" size={32} />
      </div>
    </div>
  );
}

export default App;
```

## 🎨 高级使用示例

### 1. 表情选择器组件

```tsx
// src/components/EmojiPicker.tsx
import React, { useState } from 'react';
import {
  getEmojisByCategory,
  EmojiCategory,
  type EmojiInfo
} from 'wechat-emojis';
import WeChatEmoji from './WeChatEmoji';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: EmojiInfo) => void;
  categories?: EmojiCategory[];
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  categories = [
    EmojiCategory.FACE,
    EmojiCategory.GESTURE,
    EmojiCategory.ANIMAL,
    EmojiCategory.BLESSING,
    EmojiCategory.OTHER
  ]
}) => {
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>(EmojiCategory.FACE);

  const categoryNames = {
    [EmojiCategory.FACE]: '人脸',
    [EmojiCategory.GESTURE]: '手势',
    [EmojiCategory.ANIMAL]: '动物',
    [EmojiCategory.BLESSING]: '祝福',
    [EmojiCategory.OTHER]: '其他'
  };

  return (
    <div className="emoji-picker">
      {/* 分类标签 */}
      <div className="emoji-categories">
        {categories.map(category => (
          <button
            key={category}
            className={`category-btn ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {categoryNames[category]}
          </button>
        ))}
      </div>

      {/* 表情网格 */}
      <div className="emoji-grid">
        {getEmojisByCategory(activeCategory).map(emoji => (
          <button
            key={emoji.name}
            className="emoji-item"
            onClick={() => onEmojiSelect(emoji)}
            title={emoji.name}
          >
            <WeChatEmoji name={emoji.name} size={24} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
```

### 2. 聊天消息组件

```tsx
// src/components/ChatMessage.tsx
import React from 'react';
import { getEmojiPath, type EmojiName } from 'wechat-emojis';

interface ChatMessageProps {
  content: string;
  emojiSize?: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ content, emojiSize = 20 }) => {
  // 解析消息中的表情标记，例如 [微笑] → 表情图片
  const parseEmojis = (text: string) => {
    const emojiRegex = /\[([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = emojiRegex.exec(text)) !== null) {
      // 添加表情前的文本
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // 添加表情
      const emojiName = match[1] as EmojiName;
      const emojiPath = getEmojiPath(emojiName);

      if (emojiPath) {
        parts.push(
          <img
            key={`emoji-${match.index}`}
            src={emojiPath}
            alt={emojiName}
            width={emojiSize}
            height={emojiSize}
            style={{
              display: 'inline-block',
              verticalAlign: 'middle',
              margin: '0 2px'
            }}
          />
        );
      } else {
        // 如果表情不存在，保留原文本
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  return (
    <div className="chat-message">
      {parseEmojis(content)}
    </div>
  );
};

export default ChatMessage;
```

## 💡 使用技巧和最佳实践

### 1. 性能优化

```tsx
// 使用 React.memo 优化表情组件
const WeChatEmoji = React.memo<WeChatEmojiProps>(({ name, size, className, alt }) => {
  // ... 组件实现
});

// 预加载常用表情
const preloadEmojis = (emojiNames: EmojiName[]) => {
  emojiNames.forEach(name => {
    const path = getEmojiPath(name);
    if (path) {
      const img = new Image();
      img.src = path;
    }
  });
};
```

### 2. 错误处理

```tsx
const WeChatEmoji: React.FC<WeChatEmojiProps> = ({ name, size = 24, fallback }) => {
  const [hasError, setHasError] = useState(false);
  const emojiPath = getEmojiPath(name);

  if (!emojiPath || hasError) {
    return fallback || <span>[{name}]</span>;
  }

  return (
    <img
      src={emojiPath}
      alt={name}
      width={size}
      height={size}
      onError={() => setHasError(true)}
    />
  );
};
```

### 3. 样式定制

```css
/* src/styles/emoji.css */
.wechat-emoji {
  display: inline-block;
  vertical-align: middle;
  user-select: none;
  pointer-events: none;
}

.emoji-picker {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.emoji-categories {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.category-btn {
  padding: 6px 12px;
  border: none;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.category-btn.active {
  background: #1890ff;
  color: white;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.emoji-item {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-item:hover {
  background: #f0f0f0;
}
```

## 🔧 TypeScript 支持

项目完全支持TypeScript，提供完整的类型定义：

```typescript
import type {
  EmojiName,      // 所有表情名称的联合类型
  EmojiInfo,      // 表情信息接口
  EmojiCategory   // 表情分类枚举
} from 'wechat-emojis';

// 类型安全的表情使用
const validEmoji: EmojiName = '微笑';  // ✅ 正确
const invalidEmoji: EmojiName = '不存在'; // ❌ TypeScript 错误
```

## 🚨 注意事项

1. **图片路径**：确保assets目录位于public文件夹根目录，并且代码中引用的路径是正确的（例如，以 `/assets/` 开头）。
2. **性能**：大量表情时考虑懒加载和虚拟滚动
3. **兼容性**：确保目标浏览器支持所需的图片格式
4. **版权**：注意表情包的使用权限和版权问题

## 📱 移动端适配

```css
/* 移动端优化 */
@media (max-width: 768px) {
  .emoji-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .emoji-item {
    padding: 8px;
  }
}
```

这样你就可以在React项目中完美使用微信表情包了！
