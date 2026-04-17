import { useEffect, useState, useRef } from 'react';
import './ThemeTransition.css';

interface ThemeTransitionProps {
  isDark: boolean;
  onAnimationComplete: () => void;
}

export default function ThemeTransition({ isDark, onAnimationComplete }: ThemeTransitionProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const animationCompletedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    console.log('🎭 [ThemeTransition] Component mounted:', { isDark });

    // 清理函数
    const cleanup = () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };

    // 淡入遮罩 (30ms 后开始)
    const timeout1 = setTimeout(() => {
      console.log('📈 [ThemeTransition] Phase 1: Fade in overlay');
      if (overlayRef.current) {
        overlayRef.current.classList.add('active');
      }

      // 在视觉最亮点时切换主题 (250ms 后)
      const timeout2 = setTimeout(() => {
        console.log('🎨 [ThemeTransition] Phase 2: Switching theme');
        if (!animationCompletedRef.current) {
          animationCompletedRef.current = true;
          onAnimationComplete();
        }

        // 淡出遮罩 (200ms 后) - 保持 active 类让 clip-path 不反弹
        const timeout3 = setTimeout(() => {
          console.log('🌊 [ThemeTransition] Phase 3: Fade out');
          if (overlayRef.current) {
            overlayRef.current.classList.add('fading');
          }

          // 清理 (550ms 后)
          const timeout4 = setTimeout(() => {
            console.log('🧹 [ThemeTransition] Phase 4: Cleanup, unmounting');
            setIsAnimating(false);
          }, 550);

          timeoutsRef.current.push(timeout4);
        }, 200);

        timeoutsRef.current.push(timeout3);
      }, 250);

      timeoutsRef.current.push(timeout2);
    }, 30);

    timeoutsRef.current.push(timeout1);

    return cleanup;
  }, [isDark, onAnimationComplete]);

  if (!isAnimating) {
    console.log('❌ [ThemeTransition] Animation complete, not rendering');
    return null;
  }

  console.log('✅ [ThemeTransition] Rendering overlay:', { isDark });

  return (
    <div className="theme-transition">
      <div
        ref={overlayRef}
        className={`theme-transition-overlay ${isDark ? 'to-dark' : 'to-light'}`}
      />
    </div>
  );
}
