import React, { useMemo } from 'react';
import { getAnimationStyle } from '../utils/foodAnimations';

interface FoodBackgroundProps {
  count?: number;
  minSize?: number;
  maxSize?: number;
  enabled?: boolean;
}

// 美食表情符号列表
const FOOD_EMOJIS = ['🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍕', '🍔', '🍟', '🌮', '🍿', '🧀', '🥚', '🍳', '🥘', '🍖', '🥩', '🥠', '🍡', '🥙', '🌯', '🍦', '🧇', '🍩', '🍪'];

// 生成随机美食背景数据
const generateRandomFoods = (count: number, minSize: number, maxSize: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)],
    x: Math.random() * 95, // 留出边缘空间
    y: Math.random() * 95,
    size: minSize + Math.random() * (maxSize - minSize),
    delay: Math.random() * 3,
  }));
};

const FoodBackground: React.FC<FoodBackgroundProps> = ({
  count = 15,
  minSize = 20,
  maxSize = 40,
  enabled = true,
}) => {
  // 使用 useMemo 确保位置在组件生命周期内保持稳定，但每次页面刷新时重新随机
  const foods = useMemo(() => generateRandomFoods(count, minSize, maxSize), [count, minSize, maxSize]);

  if (!enabled) return null;

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
