/**
 * 微信表情选择器 React 组件
 * 提供分类浏览和选择表情的功能
 */
import React, { useState, useMemo } from 'react';
import {
  getEmojisByCategory,
  EmojiCategory,
  searchEmojis,
  type EmojiInfo
} from '../../wechatEmoji';
import WeChatEmoji from './WeChatEmoji';

interface EmojiPickerProps {
  /** 选择表情时的回调 */
  onEmojiSelect: (emoji: EmojiInfo) => void;
  /** 要显示的分类，默认显示所有分类 */
  categories?: EmojiCategory[];
  /** 是否显示搜索框 */
  showSearch?: boolean;
  /** 表情尺寸 */
  emojiSize?: number;
  /** 每行显示的表情数量 */
  columns?: number;
  /** 最大高度 */
  maxHeight?: number;
}

/**
 * 表情选择器组件
 *
 * @example
 * ```tsx
 * <EmojiPicker
 *   onEmojiSelect={(emoji) => console.log('选择了:', emoji.name)}
 *   showSearch={true}
 * />
 * ```
 */
const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  categories = [
    EmojiCategory.FACE,
    EmojiCategory.GESTURE,
    EmojiCategory.ANIMAL,
    EmojiCategory.BLESSING,
    EmojiCategory.OTHER
  ],
  showSearch = false,
  emojiSize = 24,
  columns = 8,
  maxHeight = 300
}) => {
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>(categories[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // 分类名称映射
  const categoryNames = {
    [EmojiCategory.FACE]: '😊 人脸',
    [EmojiCategory.GESTURE]: '👋 手势',
    [EmojiCategory.ANIMAL]: '🐷 动物',
    [EmojiCategory.BLESSING]: '🎉 祝福',
    [EmojiCategory.OTHER]: '🌟 其他'
  };

  // 获取当前显示的表情列表
  const displayEmojis = useMemo(() => {
    if (searchQuery.trim()) {
      return searchEmojis(searchQuery);
    }
    return getEmojisByCategory(activeCategory);
  }, [activeCategory, searchQuery]);

  return (
    <div className="emoji-picker" style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '12px',
      background: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      width: '320px'
    }}>
      {/* 搜索框 */}
      {showSearch && (
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="搜索表情..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
      )}

      {/* 分类标签 */}
      {!searchQuery && (
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '12px',
          borderBottom: '1px solid #f0f0f0',
          paddingBottom: '8px',
          flexWrap: 'wrap'
        }}>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: activeCategory === category ? '#1890ff' : '#f5f5f5',
                color: activeCategory === category ? 'white' : '#333',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
            >
              {categoryNames[category]}
            </button>
          ))}
        </div>
      )}

      {/* 表情网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '4px',
        maxHeight: `${maxHeight}px`,
        overflowY: 'auto',
        padding: '4px'
      }}>
        {displayEmojis.map(emoji => (
          <button
            key={emoji.name}
            onClick={() => onEmojiSelect(emoji)}
            title={emoji.name}
            style={{
              padding: '6px',
              border: 'none',
              background: 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <WeChatEmoji name={emoji.name} size={emojiSize} />
          </button>
        ))}
      </div>

      {/* 空状态 */}
      {displayEmojis.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#999',
          fontSize: '14px'
        }}>
          {searchQuery ? '没有找到匹配的表情' : '该分类暂无表情'}
        </div>
      )}

      {/* 统计信息 */}
      <div style={{
        marginTop: '8px',
        padding: '4px 0',
        borderTop: '1px solid #f0f0f0',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        {searchQuery ? `找到 ${displayEmojis.length} 个表情` : `${categoryNames[activeCategory]} (${displayEmojis.length}个)`}
      </div>
    </div>
  );
};

export default EmojiPicker;
