import React, { useEffect, useState, useMemo } from 'react';
import { getRandomFoods, getAnimationStyle } from '../utils/foodAnimations';

interface FoodBackgroundProps {
  count?: number;
  minSize?: number;
  maxSize?: number;
  enabled?: boolean;
}

const FoodBackground: React.FC<FoodBackgroundProps> = ({
  count = 15,
  minSize = 20,
  maxSize = 60,
  enabled = true,
}) => {
  // 使用 useMemo 缓存随机数据，避免每次渲染重新计算
  const foods = useMemo(() => {
    if (!enabled) return [];

    const randomFoods = getRandomFoods(count);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: randomFoods[i % randomFoods.length],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: minSize + Math.random() * (maxSize - minSize),
      delay: Math.random() * 3,
    }));
  }, [count, minSize, maxSize, enabled]);

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
