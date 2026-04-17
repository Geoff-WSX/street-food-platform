import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAnimationStyle, foodEmojis } from '../utils/foodAnimations';

interface FoodBackgroundProps {
  count?: number;
  minSize?: number;
  maxSize?: number;
  enabled?: boolean;
  updateInterval?: number; // 更新间隔（毫秒）
}

// 动画类型列表
const ANIMATION_TYPES = ['float', 'rotateFloat', 'bounce', 'pulse', 'sway', 'wave'] as const;

// 生成随机美食背景数据
const generateRandomFoods = (count: number, minSize: number, maxSize: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `food-${i}-${Date.now()}`,
    emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
    x: Math.random() * 95, // 留出边缘空间
    y: Math.random() * 95,
    size: minSize + Math.random() * (maxSize - minSize),
    delay: Math.random() * 3,
    animationType: ANIMATION_TYPES[Math.floor(Math.random() * ANIMATION_TYPES.length)],
    duration: 2 + Math.random() * 4, // 2-6秒的动画时长
  }));
};

const FoodBackground: React.FC<FoodBackgroundProps> = ({
  count = 20,
  minSize = 16,
  maxSize = 48,
  enabled = true,
  updateInterval = 8000, // 每8秒更新一次
}) => {
  const [foods, setFoods] = useState(() => generateRandomFoods(count, minSize, maxSize));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUpdatingRef = useRef(false);

  // 更新美食图标位置和样式
  const updateFoods = useCallback(() => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    // 使用 requestAnimationFrame 确保在下一帧更新，避免卡顿
    requestAnimationFrame(() => {
      setFoods(prevFoods => {
        // 每次更新一半的图标，保持连续性
        const updateCount = Math.ceil(count / 2);
        const newFoods = [...prevFoods];

        for (let i = 0; i < updateCount; i++) {
          const randomIndex = Math.floor(Math.random() * count);
          newFoods[randomIndex] = {
            id: `food-${randomIndex}-${Date.now()}-${i}`,
            emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
            x: Math.random() * 95,
            y: Math.random() * 95,
            size: minSize + Math.random() * (maxSize - minSize),
            delay: Math.random() * 3,
            animationType: ANIMATION_TYPES[Math.floor(Math.random() * ANIMATION_TYPES.length)],
            duration: 2 + Math.random() * 4,
          };
        }

        return newFoods;
      });

      // 延迟重置标志，确保更新完成
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    });
  }, [count, minSize, maxSize]);

  // 设置定时更新
  useEffect(() => {
    if (!enabled) return;

    // 清除之前的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 设置新的定时器
    intervalRef.current = setInterval(() => {
      updateFoods();
    }, updateInterval);

    // 组件卸载时清除定时器
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, updateInterval, updateFoods]);

  if (!enabled) return null;

  return (
    <div
      className="food-background-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden'
      }}
    >
      {foods.map((food) => (
        <div
          key={food.id}
          className="food-background-item"
          style={{
            position: 'absolute',
            left: `${food.x}%`,
            top: `${food.y}%`,
            fontSize: `${food.size}px`,
            opacity: 0.08 + Math.random() * 0.08, // 0.08-0.16 的随机透明度
            userSelect: 'none',
            willChange: 'transform, opacity',
            transition: 'opacity 0.5s ease-in-out',
            ...getAnimationStyle(food.animationType, food.duration, food.delay),
          }}
        >
          {food.emoji}
        </div>
      ))}
    </div>
  );
};

export default FoodBackground;
