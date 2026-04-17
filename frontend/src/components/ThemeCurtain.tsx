import { useEffect, useState, useRef } from 'react';
import './ThemeCurtain.css';

interface ThemeCurtainProps {
  isDark: boolean;
  onAnimationComplete: () => void;
}

export default function ThemeCurtain({ isDark, onAnimationComplete }: ThemeCurtainProps) {
  const [isVisible, setIsVisible] = useState(false);
  const animationRef = useRef<number | undefined>(undefined);

  // 动画进度更新（用于触发主题切换）
  useEffect(() => {
    if (!isVisible) {
      setIsVisible(true);

      // 动画完成后切换主题
      setTimeout(() => {
        onAnimationComplete();

        // 窗帘收起
        setTimeout(() => {
          setIsVisible(false);
        }, 100);
      }, 1200);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, onAnimationComplete]);

  if (!isVisible) return null;

  return (
    <div className={`theme-curtain animating ${isDark ? 'to-dark' : 'to-light'}`}>
      <div className="curtain-overlay"></div>
    </div>
  );
}
