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

// 获取动画样式对象
export const getAnimationStyle = (name: string, duration = 2, delay = 0) => {
  return {
    animation: `${name} ${duration}s ease-in-out ${delay}s infinite`,
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
