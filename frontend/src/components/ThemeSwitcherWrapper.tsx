import { useEffect } from 'react';
import { useThemeStore } from '../store/theme';
import ThemeTransition from './ThemeTransition';

export default function ThemeSwitcherWrapper() {
  const { isAnimating, pendingTheme, onAnimationComplete } = useThemeStore();

  // 初始化主题
  useEffect(() => {
    console.log('🎬 [ThemeSwitcherWrapper] Initializing theme');
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme-storage');
      if (stored) {
        try {
          const { state } = JSON.parse(stored);
          console.log('📦 [ThemeSwitcherWrapper] Found stored theme:', state);
          if (state?.mode) {
            document.documentElement.setAttribute('data-theme', state.mode);
            console.log('✅ [ThemeSwitcherWrapper] Applied stored theme:', state.mode);
          }
        } catch (e) {
          console.error('❌ [ThemeSwitcherWrapper] Error parsing stored theme:', e);
          document.documentElement.setAttribute('data-theme', 'light');
        }
      } else {
        console.log('📝 [ThemeSwitcherWrapper] No stored theme found, using light');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }, []);

  // 监听动画状态变化
  useEffect(() => {
    console.log('🎭 [ThemeSwitcherWrapper] Animation state changed:', {
      isAnimating,
      pendingTheme
    });
  }, [isAnimating, pendingTheme]);

  console.log('🔍 [ThemeSwitcherWrapper] Rendering:', { isAnimating, pendingTheme });

  return (
    <>
      {isAnimating && pendingTheme && (
        <ThemeTransition
          isDark={pendingTheme === 'dark'}
          onAnimationComplete={onAnimationComplete}
        />
      )}
    </>
  );
}
