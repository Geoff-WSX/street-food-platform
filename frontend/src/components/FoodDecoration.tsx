import React from 'react';
import { getAnimationStyle } from '../utils/foodAnimations';

interface FoodDecorationProps {
  type?: 'top' | 'bottom' | 'corner' | 'scattered';
  className?: string;
}

const FoodDecoration: React.FC<FoodDecorationProps> = ({ type = 'scattered', className = '' }) => {
  const decorations = {
    top: ['🍜', '🍲', '🍛', '🍣'],
    bottom: ['🍕', '🍔', '🍟', '🌭'],
    corner: ['🌶', '🧄', '🥔', '🧅'],
    scattered: ['🍜', '🍲', '🍕', '🍔', '🥟', '🍣', '🍛', '🌮', '🍿', '🧀'],
  };

  const items = decorations[type] || decorations.scattered;

  return (
    <div className={`food-decoration ${type}`} style={{ position: 'relative', overflow: 'hidden' }}>
      {items.map((food, index) => (
        <span
          key={index}
          className="food-icon"
          style={{
            position: 'absolute',
            fontSize: 24,
            opacity: 0.2,
            pointerEvents: 'none',
            left: `${10 + (index * 20)}%`,
            top: type === 'top' ? '10px' : type === 'bottom' ? 'auto' : `${20 + (index * 15)}%`,
            bottom: type === 'bottom' ? '10px' : 'auto',
            ...getAnimationStyle('float', 3 + (index * 0.3), index * 0.2),
          }}
        >
          {food}
        </span>
      ))}
    </div>
  );
};

export default FoodDecoration;
