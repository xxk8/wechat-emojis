/**
 * 微信表情 React 组件
 * 用于在React项目中显示微信表情
 */
import React, { useState } from 'react';
import { getEmojiPath, type EmojiName } from '../../wechatEmoji';

interface WeChatEmojiProps {
  /** 表情名称 */
  name: EmojiName;
  /** 表情尺寸，默认24px */
  size?: number;
  /** 自定义CSS类名 */
  className?: string;
  /** 图片alt属性 */
  alt?: string;
  /** 加载失败时的回退内容 */
  fallback?: React.ReactNode;
  /** 点击事件处理 */
  onClick?: () => void;
}

/**
 * 微信表情组件
 *
 * @example
 * ```tsx
 * <WeChatEmoji name="微笑" size={20} />
 * <WeChatEmoji name="大哭" size={32} onClick={() => console.log('点击了表情')} />
 * ```
 */
const WeChatEmoji: React.FC<WeChatEmojiProps> = ({
  name,
  size = 24,
  className = '',
  alt,
  fallback,
  onClick
}) => {
  const [hasError, setHasError] = useState(false);
  const emojiPath = getEmojiPath(name);

  // 如果表情不存在或加载失败，显示回退内容
  if (!emojiPath || hasError) {
    return (
      <span className={`wechat-emoji-fallback ${className}`}>
        {fallback || `[${name}]`}
      </span>
    );
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
        verticalAlign: 'middle',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
      onClick={onClick}
      onError={() => setHasError(true)}
      draggable={false}
    />
  );
};

export default React.memo(WeChatEmoji);
