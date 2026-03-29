import React from 'react';
import { getRandomFoods, getAnimationStyle } from '../utils/foodAnimations';

interface FoodBackgroundProps {
  count?: number;
  minSize?: number;
  maxSize?: number;
  enabled?: boolean;
}

// 预定义的固定美食背景数据（避免每次渲染重新计算）
const FIXED_FOODS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  emoji: ['🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍕', '🍔', '🍟', '🌮', '🍿', '🧀', '🥚', '🍳', '🥘', '🍖', '🥩', '🥠', '🍡'][i % 20],
  x: (i * 5) % 100,
  y: (i * 7) % 100,
  size: 20 + (i % 3) * 12,
  delay: (i % 5) * 0.6,
}));

const FoodBackground: React.FC<FoodBackgroundProps> = ({
  count = 15,
  minSize = 20,
  maxSize = 60,
  enabled = true,
}) => {
  if (!enabled) return null;

  // 只使用前 count 个元素
  const foods = FIXED_FOODS.slice(0, Math.min(count, FIXED_FOODS.length));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
      {foods.map((food) => (
        <div
          key={food.id}
          style={{
            position: 'absolute',
            left: `${food.x}%`,
            top: `${food.y}%`,
            fontSize: `${food.size}px`,
            opacity: 0.12,
            userSelect: 'none',
            ...getAnimationStyle('float', 3 + food.delay, food.delay),
          }}
        >
          {food.emoji}
        </div>
      ))}
    </div>
  );
};

export default FoodBackground;
