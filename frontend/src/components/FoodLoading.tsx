import React from 'react';
import { Spin } from 'antd';
import { getAnimationStyle } from '../utils/foodAnimations';

interface FoodLoadingProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
}

const FoodLoading: React.FC<FoodLoadingProps> = ({ size = 'default', tip = '加载中...' }) => {
  const loadingFoods = ['🍜', '🍲', '🥟', '🍕', '🍔'];
  const sizeMap = { small: 24, default: 48, large: 72 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {loadingFoods.map((food, index) => (
          <span
            key={index}
            style={{
              fontSize: sizeMap[size],
              display: 'inline-block',
              ...getAnimationStyle('bounceIn', 0.8, index * 0.15),
            }}
          >
            {food}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 14, color: '#999' }}>{tip}</span>
    </div>
  );
};

export default FoodLoading;
