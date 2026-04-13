import { useEffect } from 'react';
import { useThemeStore, themeUtils } from '../store/theme';

/**
 * 主题切换快捷键 Hook
 * 支持 Cmd/Ctrl + Shift + T 快速切换主题
 */
export const useThemeShortcut = () => {
  const { mode } = useThemeStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + T
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 't') {
        event.preventDefault();
        themeUtils.toggleWithAnimation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode]);
};

/**
 * 主题跟随系统 Hook
 * 自动跟随系统主题变化
 */
export const useFollowSystemTheme = (enabled: boolean = false) => {
  const { setTheme } = useThemeStore();

  useEffect(() => {
    if (!enabled) return;

    // 检查初始系统主题
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      }
    };
  }, [enabled, setTheme]);
};

/**
 * 主题时间自动切换 Hook
 * 根据时间自动切换主题（白天/夜晚）
 */
export const useTimeBasedTheme = (enabled: boolean = false) => {
  const { setTheme } = useThemeStore();

  useEffect(() => {
    if (!enabled) return;

    const checkTimeAndSetTheme = () => {
      const hour = new Date().getHours();
      // 假设 6:00 - 18:00 为白天
      const isDayTime = hour >= 6 && hour < 18;
      setTheme(isDayTime ? 'light' : 'dark');
    };

    // 初始检查
    checkTimeAndSetTheme();

    // 每分钟检查一次
    const interval = setInterval(checkTimeAndSetTheme, 60000);

    return () => clearInterval(interval);
  }, [enabled, setTheme]);
};

export default useThemeShortcut;
