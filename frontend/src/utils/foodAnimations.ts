// 美食图标数据
export const foodEmojis = [
  '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🥡',
  '🥠', '🥮', '🍢', '🍡', '🍘', '🥙', '🧆', '🥔',
  '🍕', '🌭', '🍔', '🍟', '🌮', '🌯', '🥙', '🧀',
  '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈',
  '🧂', '🌶', '🥕', '🧄', '🧅', '🥔', '🍠', '🥬',
  '🥒', '🌽', '🥦', '🍄', '🥜', '🌰', '🍞', '🥐',
  '🥖', '🥨', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔',
  '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆',
  '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪',
  '🍤', '🍚', '🍘', '🍙', '🍛', '🍚', '🍜', '🍝',
  '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟',
  '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦',
  '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧',
  '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕'
];

// 获取随机美食图标
export const getRandomFood = (): string => {
  return foodEmojis[Math.floor(Math.random() * foodEmojis.length)];
};

// 获取随机美食数组
export const getRandomFoods = (count: number): string[] => {
  const shuffled = [...foodEmojis].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// 动画名称映射
const animationMap: Record<string, string> = {
  float: 'foodFloat',
  rotateFloat: 'foodRotateFloat',
  bounce: 'foodBounce',
  pulse: 'foodPulse',
  bounceIn: 'foodBounceIn',
  fadeInUp: 'foodFadeInUp',
  scaleRotate: 'foodScaleRotate',
  sparkle: 'foodSparkle',
  flame: 'foodFlame',
};

// 获取动画样式对象
export const getAnimationStyle = (name: string, duration = 2, delay = 0) => {
  const animationName = animationMap[name] || name;
  return {
    animation: `${animationName} ${duration}s ease-in-out ${delay}s infinite`,
  };
};

// 美食装饰元素
export const FoodDecorations = {
  // 顶部装饰
  top: ['🍜', '🍲', '🍛', '🍣', '🥟'],
  // 底部装饰
  bottom: ['🍕', '🍔', '🍟', '🌭', '🍿'],
  // 左侧装饰
  left: ['🌶', '🧄', '🥔', '🧅', '🥕'],
  // 右侧装饰
  right: ['🧀', '🥚', '🍳', '🥓', '🍖'],
};

// 美食分类
export const FoodCategories = {
  noodles: ['🍜', '🍝', '🍲', '🍛'],
  rice: ['🍚', '🍘', '🍙', '🥡'],
  dumplings: ['🥟', '🥠', '🦪', '🍤'],
  fastFood: ['🍕', '🍔', '🍟', '🌭'],
  snacks: ['🌮', '🌯', '🍿', '🧀'],
  seafood: ['🦀', '🦞', '🦐', '🦑'],
  desserts: ['🍦', '🍨', '🍩', '🍪', '🎂', '🍰'],
  drinks: ['🍼', '🥛', '☕', '🍵'],
  cooking: ['🧂', '🌶', '🥕', '🧄', '🧅'],
};

// 获取特定分类的美食
export const getFoodsByCategory = (category: keyof typeof FoodCategories): string[] => {
  return FoodCategories[category] || [];
};

// 生成装饰位置数据
export const generateDecorations = (count: number, type: 'scatter' | 'circle' | 'wave' = 'scatter') => {
  const decorations: Array<{ emoji: string; x: number; y: number; size: number; delay: number; rotation: number }> = [];

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;

    switch (type) {
      case 'circle': {
        const angle = (i / count) * Math.PI * 2;
        const radius = 35 + Math.random() * 10;
        x = 50 + Math.cos(angle) * radius;
        y = 50 + Math.sin(angle) * radius;
        break;
      }
      case 'wave': {
        x = (i / count) * 100;
        y = 50 + Math.sin((i / count) * Math.PI * 4) * 20;
        break;
      }
      default: {
        // scatter
        x = 5 + Math.random() * 90;
        y = 5 + Math.random() * 90;
      }
    }

    decorations.push({
      emoji: getRandomFood(),
      x,
      y,
      size: 16 + Math.random() * 24,
      delay: Math.random() * 2,
      rotation: Math.random() * 30 - 15,
    });
  }

  return decorations;
};
