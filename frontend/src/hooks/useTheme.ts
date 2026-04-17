import { useEffect } from 'react';
import { useThemeStore } from '../store/theme';

/**
 * 主题 Hook
 * 提供主题相关的便捷方法和状态
 */
export const useTheme = () => {
  const {
    mode,
    contrast,
    fontScale,
    reduceMotion,
    toggleTheme,
    setTheme,
    setContrast,
    setFontScale,
    setReduceMotion,
  } = useThemeStore();

  // 切换主题（带动画）
  const toggleWithAnimation = () => {
    // 动画由 ThemeTransition 组件处理，这里直接切换主题
    toggleTheme();
  };

  // 监听主题变化
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      console.log('主题已切换到:', event.detail.mode);
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);

    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
    };
  }, []);

  return {
    // 当前状态
    mode,
    contrast,
    fontScale,
    reduceMotion,
    isDark: mode === 'dark',
    isLight: mode === 'light',

    // 操作方法
    toggleTheme,
    setTheme,
    toggleWithAnimation,
    setContrast,
    setFontScale,
    setReduceMotion,
  };
};

/**
 * 主题颜色 Hook
 * 获取当前主题的颜色值
 */
export const useThemeColors = () => {
  const { mode } = useThemeStore();

  const getColor = (colorName: string): string => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${colorName}`)
      .trim() || '#000000';
  };

  return {
    mode,
    isDark: mode === 'dark',
    isLight: mode === 'light',

    // 主题颜色
    primary: getColor('color-primary'),
    success: getColor('color-success'),
    warning: getColor('color-warning'),
    error: getColor('color-error'),
    info: getColor('color-info'),

    // 背景颜色
    bgPrimary: getColor('bg-primary'),
    bgSecondary: getColor('bg-secondary'),
    bgTertiary: getColor('bg-tertiary'),
    bgElevated: getColor('bg-elevated'),

    // 文字颜色
    textPrimary: getColor('text-primary'),
    textSecondary: getColor('text-secondary'),
    textTertiary: getColor('text-tertiary'),

    // 边框颜色
    borderColor: getColor('border-color'),
    borderSecondary: getColor('border-color-secondary'),

    // 自定义获取方法
    getColor,
  };
};

/**
 * 主题切换动画 Hook
 * 自动管理主题切换时的动画效果
 */
export const useThemeTransition = () => {
  const { mode } = useThemeStore();

  useEffect(() => {
    // 主题切换时添加过渡效果
    const transitionDuration = 300; // 300ms
    const elements = document.querySelectorAll('*');

    elements.forEach((el) => {
      (el as HTMLElement).style.transition = `background-color ${transitionDuration}ms ease, color ${transitionDuration}ms ease`;
    });

    // 清除过渡效果
    const timer = setTimeout(() => {
      elements.forEach((el) => {
        (el as HTMLElement).style.transition = '';
      });
    }, transitionDuration);

    return () => clearTimeout(timer);
  }, [mode]);

  return { mode };
};

export default useTheme;
