import React, { useEffect, useState } from 'react';
import { getRandomFoods, getAnimationStyle, foodBackgroundStyles } from '../utils/foodAnimations';

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
  const [foods, setFoods] = useState<Array<{ id: number; emoji: string; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    if (!enabled) return;

    const newFoods = Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: getRandomFoods(count)[i % count],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: minSize + Math.random() * (maxSize - minSize),
      delay: Math.random() * 3,
    }));
    setFoods(newFoods);
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
            ...getAnimationStyle('float', 3 + Math.random() * 2, food.delay),
          }}
        >
          {food.emoji}
        </div>
      ))}
    </div>
  );
};

export default FoodBackground;
