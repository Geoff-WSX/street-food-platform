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
export const getRandomFood = () => {
  return foodEmojis[Math.floor(Math.random() * foodEmojis.length)];
};

// 获取随机美食数组
export const getRandomFoods = (count: number) => {
  const shuffled = [...foodEmojis].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// CSS 动画关键帧（返回字符串形式）
export const getAnimationKeyframes = (name: string): string => {
  const animations: Record<string, string> = {
    float: `
      0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
      25% { transform: translateY(-10px) rotate(2deg); opacity: 1; }
      50% { transform: translateY(-20px) rotate(0deg); opacity: 0.8; }
      75% { transform: translateY(-10px) rotate(-2deg); opacity: 1; }
    `,
    bounceIn: `
      0% { opacity: 0; transform: scale(0.3) translateY(-100px); }
      50% { opacity: 1; transform: scale(1.05) translateY(10px); }
      70% { transform: scale(0.9) translateY(-5px); }
      100% { transform: scale(1) translateY(0); }
    `,
    pulse: `
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    `,
    rotateFloat: `
      0% { transform: translateY(0px) rotate(0deg) scale(1); }
      50% { transform: translateY(-30px) rotate(180deg) scale(1.1); }
      100% { transform: translateY(0px) rotate(360deg) scale(1); }
    `,
  };
  return animations[name] || '';
};

// 获取动画样式对象
export const getAnimationStyle = (name: string, duration = 2, delay = 0) => ({
  animation: `${name} ${duration}s ease-in-out ${delay}s infinite`,
});

// CSS 动画关键帧
export const animations = {
  // 漂浮动画
  float: keyframes`
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
      opacity: 0.7;
    }
    25% {
      transform: translateY(-10px) rotate(2deg);
      opacity: 1;
    }
    50% {
      transform: translateY(-20px) rotate(0deg);
      opacity: 0.8;
    }
    75% {
      transform: translateY(-10px) rotate(-2deg);
      opacity: 1;
    }
  `,

  // 旋转漂浮
  rotateFloat: keyframes`
    0% {
      transform: translateY(0px) rotate(0deg) scale(1);
    }
    50% {
      transform: translateY(-30px) rotate(180deg) scale(1.1);
    }
    100% {
      transform: translateY(0px) rotate(360deg) scale(1);
    }
  `,

  // 脉跳效果
  pulse: keyframes`
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  `,

  // 摇晃效果
  shake: keyframes`
    0%, 100% {
      transform: rotate(0deg);
    }
    10%, 30%, 50%, 70%, 90% {
      transform: rotate(-5deg);
    }
    20%, 40%, 60%, 80% {
      transform: rotate(5deg);
    }
  `,

  // 弹跳进入
  bounceIn: keyframes`
    0% {
      opacity: 0;
      transform: scale(0.3) translateY(-100px);
    }
    50% {
      opacity: 1;
      transform: scale(1.05) translateY(10px);
    }
    70% {
      transform: scale(0.9) translateY(-5px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  `,

  // 渐入上升
  fadeInUp: keyframes`
    0% {
      opacity: 0;
      transform: translateY(30px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  `,

  // 缩放旋转
  scaleRotate: keyframes`
    0% {
      transform: scale(0) rotate(0deg);
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(360deg);
      opacity: 0;
    }
  `,

  // 烹饪烟雾
  steam: keyframes`
    0% {
      transform: translateY(0) scale(1);
      opacity: 0.6;
    }
    50% {
      transform: translateY(-20px) scale(1.2);
      opacity: 0.3;
    }
    100% {
      transform: translateY(-40px) scale(1.5);
      opacity: 0;
    }
  `,

  // 闪烁
  sparkle: keyframes`
    0%, 100% {
      opacity: 0;
      transform: scale(0);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  `,

  // 滑入左侧
  slideInLeft: keyframes`
    0% {
      transform: translateX(-100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  `,

  // 滑入右侧
  slideInRight: keyframes`
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  `,

  // 缩放弹出
  zoomIn: keyframes`
    0% {
      transform: scale(0);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  `,

  // 波纹扩散
  ripple: keyframes`
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  `,

  // 美食图标跳动
  foodBounce: keyframes`
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    25% {
      transform: translateY(-15px) rotate(-10deg);
    }
    50% {
      transform: translateY(-25px) rotate(0deg);
    }
    75% {
      transform: translateY(-15px) rotate(10deg);
    }
  `,

  // 火焰闪烁
  flame: keyframes`
    0%, 100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }
    25% {
      opacity: 0.8;
      transform: scale(1.1) rotate(5deg);
    }
    50% {
      opacity: 1;
      transform: scale(0.9) rotate(-5deg);
    }
    75% {
      opacity: 0.9;
      transform: scale(1.05) rotate(3deg);
    }
  `,
};

// 动画样式
export const getAnimationStyle = (animation: keyof typeof animations, duration = 2, delay = 0) => ({
  animation: `${animation} ${duration}s ease-in-out ${delay}s infinite`,
});

// 美食背景组件样式
export const foodBackgroundStyles = {
  container: {
    position: 'relative' as const,
    overflow: 'hidden',
  },
  floatingFood: (x: number, y: number, size: number, delay: number) => ({
    position: 'absolute' as const,
    left: `${x}%`,
    top: `${y}%`,
    fontSize: `${size}px`,
    opacity: 0.15,
    pointerEvents: 'none' as const,
    ...getAnimationStyle('float', 3 + Math.random() * 2, delay),
  }),
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
