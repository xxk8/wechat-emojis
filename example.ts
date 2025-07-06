/**
 * 微信表情包使用示例
 * 演示如何在项目中使用 wechatEmoji.ts 模块
 */

import WeChatEmojis, {
  EmojiCategory,
  EmojiInfo,
  EmojiName,
  getEmojiPath,
  getEmojiInfo,
  getEmojisByCategory,
  getAllEmojis,
  searchEmojis,
  hasEmoji,
  getEmojiNames,
  getRandomEmoji
} from './wechatEmoji';

// 示例 1: 获取单个表情的路径
console.log('=== 示例 1: 获取表情路径 ===');
const smilePath = getEmojiPath('微笑');
console.log(`微笑表情路径: ${smilePath}`);

const invalidPath = getEmojiPath('不存在的表情' as EmojiName);
console.log(`不存在表情的路径: ${invalidPath}`);

// 示例 2: 获取表情详细信息
console.log('\n=== 示例 2: 获取表情信息 ===');
const emojiInfo = getEmojiInfo('微笑');
if (emojiInfo) {
  console.log(`表情名称: ${emojiInfo.name}`);
  console.log(`表情类别: ${emojiInfo.category}`);
  console.log(`图片路径: ${emojiInfo.path}`);
}

// 示例 3: 按类别获取表情
console.log('\n=== 示例 3: 按类别获取表情 ===');
const faceEmojis = getEmojisByCategory(EmojiCategory.FACE);
console.log(`人脸表情数量: ${faceEmojis.length}`);
console.log('前5个人脸表情:', faceEmojis.slice(0, 5).map(e => e.name));

const gestureEmojis = getEmojisByCategory(EmojiCategory.GESTURE);
console.log(`手势表情数量: ${gestureEmojis.length}`);
console.log('所有手势表情:', gestureEmojis.map(e => e.name));

// 示例 4: 搜索表情
console.log('\n=== 示例 4: 搜索表情 ===');
const laughEmojis = searchEmojis('笑');
console.log('包含"笑"的表情:', laughEmojis.map(e => e.name));

const heartEmojis = searchEmojis('心');
console.log('包含"心"的表情:', heartEmojis.map(e => e.name));

// 示例 5: 检查表情是否存在
console.log('\n=== 示例 5: 检查表情存在性 ===');
console.log(`"微笑"是否存在: ${hasEmoji('微笑')}`);
console.log(`"不存在"是否存在: ${hasEmoji('不存在')}`);

// 示例 6: 获取所有表情
console.log('\n=== 示例 6: 获取所有表情 ===');
const allEmojis = getAllEmojis();
console.log(`总表情数量: ${allEmojis.length}`);

// 按类别统计
const categoryStats = Object.values(EmojiCategory).map(category => ({
  category,
  count: getEmojisByCategory(category).length
}));
console.log('各类别表情数量:', categoryStats);

// 示例 7: 获取表情名称列表
console.log('\n=== 示例 7: 获取表情名称 ===');
const allNames = getEmojiNames();
console.log(`所有表情名称数量: ${allNames.length}`);

const faceNames = getEmojiNames(EmojiCategory.FACE);
console.log(`人脸表情名称数量: ${faceNames.length}`);

// 示例 8: 随机获取表情
console.log('\n=== 示例 8: 随机表情 ===');
const randomEmoji = getRandomEmoji();
console.log(`随机表情: ${randomEmoji.name} (${randomEmoji.category})`);

const randomFaceEmoji = getRandomEmoji(EmojiCategory.FACE);
console.log(`随机人脸表情: ${randomFaceEmoji.name}`);

// 示例 9: 使用默认导出
console.log('\n=== 示例 9: 使用默认导出 ===');
const path = WeChatEmojis.getEmojiPath('爱心');
console.log(`通过默认导出获取爱心路径: ${path}`);

// 示例 10: 在 React 组件中的使用示例（伪代码）
console.log('\n=== 示例 10: React 使用示例 ===');
console.log(`
// React 组件示例
import React from 'react';
import { getEmojiPath, getEmojisByCategory, EmojiCategory } from './wechatEmoji';

const EmojiPicker: React.FC = () => {
  const faceEmojis = getEmojisByCategory(EmojiCategory.FACE);

  return (
    <div className="emoji-picker">
      {faceEmojis.map(emoji => (
        <img
          key={emoji.name}
          src={getEmojiPath(emoji.name)}
          alt={emoji.name}
          title={emoji.name}
          className="emoji-item"
        />
      ))}
    </div>
  );
};
`);

// 示例 11: 类型安全的使用
console.log('\n=== 示例 11: 类型安全 ===');
// TypeScript 会在编译时检查表情名称是否有效
const validEmoji: EmojiName = '微笑'; // ✅ 有效
// const invalidEmoji: EmojiName = '无效表情'; // ❌ 编译错误

console.log('类型安全的表情使用完成');
