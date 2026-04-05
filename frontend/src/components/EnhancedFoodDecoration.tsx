import React, { useMemo } from 'react';
import { getAnimationStyle, generateDecorations, getRandomFoods } from '../utils/foodAnimations';

interface EnhancedFoodDecorationProps {
  type?: 'scatter' | 'circle' | 'wave' | 'corners';
  count?: number;
  size?: number;
  opacity?: number;
  animated?: boolean;
  className?: string;
}

const EnhancedFoodDecoration: React.FC<EnhancedFoodDecorationProps> = ({
  type = 'scatter',
  count = 15,
  size = 24,
  opacity = 0.15,
  animated = true,
  className = '',
}) => {
  const decorations = useMemo(() => {
    if (type === 'corners') {
      // 四角装饰模式
      return [
        { emoji: '🍜', x: 5, y: 10, rotation: -15 },
        { emoji: '🍲', x: 90, y: 5, rotation: 20 },
        { emoji: '🍣', x: 5, y: 85, rotation: 10 },
        { emoji: '🥟', x: 92, y: 90, rotation: -10 },
        { emoji: '🍕', x: 15, y: 5, rotation: -5 },
        { emoji: '🍔', x: 85, y: 92, rotation: 15 },
      ];
    }
    return generateDecorations(count, type);
  }, [type, count]);

  return (
    <div className={`food-decoration-enhanced ${className}`} style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: 0,
    }}>
      {decorations.map((dec, index) => (
        <span
          key={index}
          className="food-decoration-icon"
          style={{
            position: 'absolute',
            left: `${dec.x}%`,
            top: `${dec.y}%`,
            fontSize: size,
            opacity,
            transform: `translate(-50%, -50%) rotate(${dec.rotation || 0}deg)`,
            ...(animated ? getAnimationStyle('float', 3 + (index % 3) * 0.5, index * 0.15) : {}),
          }}
        >
          {dec.emoji}
        </span>
      ))}
    </div>
  );
};

// 美食边框装饰组件
interface FoodBorderProps {
  children: React.ReactNode;
  food?: string;
  className?: string;
}

export const FoodBorder: React.FC<FoodBorderProps> = ({
  children,
  food = '🍜',
  className = '',
}) => {
  return (
    <div className={`food-border-wrapper ${className}`} style={{
      position: 'relative',
      display: 'inline-block',
    }}>
      <span
        className="food-border-icon"
        style={{
          position: 'absolute',
          left: -20,
          top: -10,
          fontSize: 20,
          animation: 'foodSway 2s ease-in-out infinite',
        }}
      >
        {food}
      </span>
      {children}
      <span
        className="food-border-icon"
        style={{
          position: 'absolute',
          right: -20,
          bottom: -10,
          fontSize: 20,
          animation: 'foodSway 2s ease-in-out infinite 0.5s',
        }}
      >
        {food}
      </span>
    </div>
  );
};

// 美食标题组件
interface FoodTitleProps {
  children: React.ReactNode;
  foods?: string[];
  className?: string;
}

export const FoodTitle: React.FC<FoodTitleProps> = ({
  children,
  foods,
  className = '',
}) => {
  const titleFoods = foods || getRandomFoods(3);

  return (
    <div className={`food-title-wrapper ${className}`} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {titleFoods.map((food, i) => (
        <span
          key={i}
          style={{
            fontSize: 28,
            display: 'inline-block',
            ...getAnimationStyle('bounceIn', 0.6, i * 0.1),
          }}
        >
          {food}
        </span>
      ))}
      <span className="food-gradient-text" style={{
        fontSize: 28,
        fontWeight: 700,
      }}>
        {children}
      </span>
    </div>
  );
};

// 美食空状态组件
interface FoodEmptyStateProps {
  title?: string;
  description?: string;
  foods?: string[];
  action?: React.ReactNode;
}

export const FoodEmptyState: React.FC<FoodEmptyStateProps> = ({
  title = '暂无内容',
  description = '还没有相关内容哦',
  foods,
  action,
}) => {
  const emptyFoods = foods || ['🍽️', '🥢', '🍜'];

  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
    }}>
      <div style={{ marginBottom: 24 }}>
        {emptyFoods.map((food, i) => (
          <span
            key={i}
            style={{
              fontSize: 48,
              margin: '0 8px',
              display: 'inline-block',
              ...getAnimationStyle('bounceIn', 0.6, i * 0.1),
            }}
          >
            {food}
          </span>
        ))}
      </div>
      <h3 style={{
        fontSize: 18,
        color: '#595959',
        marginBottom: 8,
        fontWeight: 500,
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: 14,
        color: '#8c8c8c',
        marginBottom: action ? 24 : 0,
      }}>
        {description}
      </p>
      {action}
    </div>
  );
};

// 美食加载指示器组件
interface FoodSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export const FoodSpinner: React.FC<FoodSpinnerProps> = ({
  size = 'medium',
  text = '加载中...',
}) => {
  const sizeMap = { small: 16, medium: 24, large: 32 };
  const spinnerFoods = ['🍜', '🍲', '🍛'];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {spinnerFoods.map((food, i) => (
          <span
            key={i}
            style={{
              fontSize: sizeMap[size],
              display: 'inline-block',
              ...getAnimationStyle('bounceIn', 0.8, i * 0.15),
            }}
          >
            {food}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 14, color: '#999' }}>{text}</span>
    </div>
  );
};

// 美食分隔线组件
interface FoodDividerProps {
  food?: string;
  text?: string;
}

export const FoodDivider: React.FC<FoodDividerProps> = ({
  food = '🌶',
  text,
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      margin: '24px 0',
    }}>
      <div style={{
        flex: 1,
        height: 1,
        background: 'linear-gradient(to right, transparent, #e8e8e8, transparent)',
      }} />
      <span style={{
        fontSize: 20,
        ...getAnimationStyle('pulse', 2, 0),
      }}>
        {food}
      </span>
      {text && (
        <span style={{
          fontSize: 14,
          color: '#8c8c8c',
        }}>
          {text}
        </span>
      )}
      <div style={{
        flex: 1,
        height: 1,
        background: 'linear-gradient(to right, transparent, #e8e8e8, transparent)',
      }} />
    </div>
  );
};

export default EnhancedFoodDecoration;
