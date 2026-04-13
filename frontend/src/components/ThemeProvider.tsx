import React, { useEffect, useState } from 'react';
import { useThemeStore, applyTheme, applyAccessibilitySettings } from '../store/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * 主题提供者组件
 * 负责在应用层面应用主题设置
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { mode, contrast, fontScale, reduceMotion } = useThemeStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 初始化主题
    applyTheme(mode);
    applyAccessibilitySettings({ contrast, fontScale, reduceMotion });

    // 标记为已准备，避免闪烁
    setIsReady(true);

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // 可以在这里实现自动跟随系统主题的功能
      console.log('系统主题已变化:', e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      }
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      applyTheme(mode);
    }
  }, [mode, isReady]);

  useEffect(() => {
    if (isReady) {
      applyAccessibilitySettings({ contrast, fontScale, reduceMotion });
    }
  }, [contrast, fontScale, reduceMotion, isReady]);

  // 在主题未准备好时，显示加载状态
  if (!isReady) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="food-loading">加载中...</div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ThemeProvider;
