import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const FOOD_ICONS = ['🍜', '🍲', '🍜', '🥟', '🦐', '🍖', '🍗', '🥘', '🍛', '🍣', '🍱', '🥠', '🍢', '🍡', '🥙', '🥪', '🌮', '🌯', '🍔', '🍟', '🍕', '🍝', '🍤', '🥘', '🍜', '🦞', '🦀', '🦘', '🥩', '🍳', '🥞'];

interface FloatingFoodIconProps {
  x: number;
  y: number;
  onComplete: () => void;
}

function FloatingFoodIcon({ x, y, onComplete }: FloatingFoodIconProps) {
  const [icon] = useState(() => FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)]);
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    // 入场动画
    const raf = requestAnimationFrame(() => {
      setScale(1);
    });

    // 消失动画
    const timer = setTimeout(() => {
      setOpacity(0);
      setTranslateY(-50);
    }, 800);

    const cleanupTimer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        fontSize: '48px',
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: 'none',
        zIndex: 9999,
        userSelect: 'none',
        textShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {icon}
    </div>
  );
}

interface FoodClickEffectsProps {
  enabled?: boolean;
}

export default function FoodClickEffects({ enabled = true }: FoodClickEffectsProps) {
  const [icons, setIcons] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [nextId, setNextId] = useState(0);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!enabled) return;

    const target = e.target as HTMLElement;

    // 检查是否点击在可交互元素上（更全面的检测）
    const interactiveSelectors = [
      // Ant Design 组件
      'button', 'a', 'input', 'textarea', 'select',
      '.ant-btn', '.ant-link', '.ant-input', '.ant-select', '.ant-cascader', '.ant-tree-select',
      '.ant-checkbox', '.ant-radio', '.ant-switch', '.ant-slider', '.ant-upload',
      '.ant-modal', '.ant-drawer', '.ant-popover', '.ant-dropdown', '.ant-tooltip',
      '.ant-tag', '.ant-badge', '.ant-avatar', '.ant-card',
      '.ant-table-cell', '.ant-list-item', '.ant-comment',
      '.ant-float-button', '.float-button',
      // 自定义组件
      '.post-card-urban', '.post-card',
      '.filter-bar', '.posts-grid', '.home-header',
      '.food-card', '.user-card',
      '.navbar', '.search-modal', '.publish-modal',
      '.ai-button', '.chat-modal',
      // 特殊交互区域
      '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
      '[contenteditable="true"]',
      '.clickable', '.interactive',
    ];

    // 检查目标元素或其父元素是否匹配任何选择器
    const isInteractive = interactiveSelectors.some(selector => {
      if (target.closest?.(selector)) return true;
      try {
        return target.matches?.(selector);
      } catch {
        return false;
      }
    });

    if (isInteractive) {
      return;
    }

    // 检查元素是否有点击事件监听器
    const hasClickHandler = target.onclick !== null ||
                           target.parentElement?.onclick !== null;

    if (hasClickHandler) {
      return;
    }

    // 限制同时显示的图标数量
    setIcons(prev => {
      if (prev.length >= 5) return prev;
      const newIcon = { id: nextId, x: e.clientX, y: e.clientY };
      setNextId(nextId + 1);
      return [...prev, newIcon];
    });
  }, [enabled, nextId]);

  const handleIconComplete = useCallback((id: number) => {
    setIcons(prev => prev.filter(icon => icon.id !== id));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // 在 document 上监听点击事件
    document.addEventListener('click', handleClick, true); // 使用捕获阶段
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [handleClick, enabled]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    icons.map(icon => (
      <FloatingFoodIcon
        key={icon.id}
        x={icon.x}
        y={icon.y}
        onComplete={() => handleIconComplete(icon.id)}
      />
    )),
    document.body
  );
}
