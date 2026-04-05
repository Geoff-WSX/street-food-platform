import React, { useState } from 'react';
import { Card } from 'antd';
import { getAnimationStyle, getRandomFood } from '../utils/foodAnimations';

interface FoodCardProps {
  children: React.ReactNode;
  className?: string;
  hoverFood?: string;
  style?: React.CSSProperties;
  foodType?: 'noodles' | 'rice' | 'snacks' | 'desserts' | 'seafood';
}

const FoodCard: React.FC<FoodCardProps> = ({
  children,
  className = '',
  hoverFood,
  style,
  foodType,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getFoodForType = () => {
    switch (foodType) {
      case 'noodles': return '🍜';
      case 'rice': return '🍚';
      case 'snacks': return '🍿';
      case 'desserts': return '🍰';
      case 'seafood': return '🦐';
      default: return getRandomFood();
    }
  };

  const displayFood = hoverFood || getFoodForType();

  return (
    <Card
      className={`food-card-enhanced ${className} ${isHovered ? 'food-card-hovered' : ''}`}
      style={{
        borderRadius: 16,
        overflow: 'visible',
        position: 'relative',
        transition: 'all 0.3s ease',
        border: '1px solid #f0f0f0',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 248, 240, 0.9) 100%)',
        backdropFilter: 'blur(10px)',
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      hoverable
    >
      {/* 悬浮美食图标 */}
      <span
        className="floating-food-icon"
        style={{
          position: 'absolute',
          top: -12,
          right: -12,
          fontSize: 28,
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translate(0, 0) rotate(0deg)' : 'translate(10px, 10px) rotate(-10deg)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 1,
          filter: 'drop-shadow(0 4px 8px rgba(255, 107, 107, 0.3))',
        }}
      >
        {displayFood}
      </span>

      {/* 角落装饰 */}
      <span
        style={{
          position: 'absolute',
          bottom: -8,
          left: -8,
          fontSize: 20,
          opacity: 0.1,
          ...getAnimationStyle('float', 3, 0),
        }}
      >
        🌶
      </span>

      {children}
    </Card>
  );
};

// 美食按钮组件
interface FoodButtonProps {
  children: React.ReactNode;
  food?: string;
  type?: 'primary' | 'default' | 'dashed';
  onClick?: () => void;
  className?: string;
}

export const FoodButton: React.FC<FoodButtonProps> = ({
  children,
  food = '🍜',
  type = 'primary',
  onClick,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle = {
    primary: {
      background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
      border: 'none',
      color: '#fff',
    },
    default: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 248, 240, 0.9) 100%)',
      border: '1px solid #ff6b6b',
      color: '#ff6b6b',
    },
    dashed: {
      background: 'transparent',
      border: '2px dashed #feca57',
      color: '#feca57',
    },
  };

  return (
    <button
      className={`food-button ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '10px 20px',
        borderRadius: 24,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: isHovered ? '0 6px 20px rgba(255, 107, 107, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        ...buttonStyle[type],
      }}
    >
      <span style={{
        fontSize: 16,
        ...getAnimationStyle(isHovered ? 'bounce' : 'float', 1, 0),
      }}>
        {food}
      </span>
      {children}
    </button>
  );
};

// 美食标签组件
interface FoodTagProps {
  children: React.ReactNode;
  food?: string;
  color?: string;
}

export const FoodTag: React.FC<FoodTagProps> = ({
  children,
  food = '🏷️',
  color = '#ff6b6b',
}) => {
  return (
    <span
      className="food-tag"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 16,
        fontSize: 13,
        fontWeight: 500,
        background: `${color}15`,
        border: `1px solid ${color}40`,
        color,
      }}
    >
      <span style={{ fontSize: 14 }}>{food}</span>
      {children}
    </span>
  );
};

export default FoodCard;
