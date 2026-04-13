/**
 * 主题工具函数
 * 提供主题相关的实用工具方法
 */

import type { ThemeMode } from '../store/theme';

/**
 * 获取当前主题模式
 */
export const getCurrentTheme = (): ThemeMode => {
  if (typeof document === 'undefined') return 'light';

  const themeAttr = document.documentElement.getAttribute('data-theme');
  return (themeAttr === 'dark' ? 'dark' : 'light');
};

/**
 * 检查是否为暗色模式
 */
export const isDarkMode = (): boolean => {
  return getCurrentTheme() === 'dark';
};

/**
 * 检查是否为亮色模式
 */
export const isLightMode = (): boolean => {
  return getCurrentTheme() === 'light';
};

/**
 * 获取 CSS 变量值
 */
export const getCssVariable = (variableName: string): string => {
  if (typeof document === 'undefined') return '';

  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
};

/**
 * 设置 CSS 变量值
 */
export const setCssVariable = (variableName: string, value: string): void => {
  if (typeof document === 'undefined') return;

  document.documentElement.style.setProperty(variableName, value);
};

/**
 * 获取主题颜色
 */
export const getThemeColor = (colorName: string): string => {
  return getCssVariable(`--${colorName}`) || '#000000';
};

/**
 * 切换主题
 */
export const toggleTheme = (): ThemeMode => {
  const newTheme = isDarkMode() ? 'light' : 'dark';

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', newTheme);

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('themechange', { detail: { mode: newTheme } }));
  }

  return newTheme;
};

/**
 * 设置主题
 */
export const setTheme = (mode: ThemeMode): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode);

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('themechange', { detail: { mode } }));
  }
};

/**
 * 添加主题切换过渡效果
 */
export const addThemeTransition = (): void => {
  if (typeof document === 'undefined') return;

  document.body.classList.add('theme-transitioning');
};

/**
 * 移除主题切换过渡效果
 */
export const removeThemeTransition = (): void => {
  if (typeof document === 'undefined') return;

  document.body.classList.remove('theme-transitioning');
};

/**
 * 带动画的主题切换
 */
export const toggleThemeWithAnimation = (): ThemeMode => {
  addThemeTransition();

  setTimeout(() => {
    const newTheme = toggleTheme();

    setTimeout(() => {
      removeThemeTransition();
    }, 300); // 等待过渡完成

    return newTheme;
  }, 50);

  // 返回默认主题，实际主题在回调中切换
  return 'light';
};

/**
 * 获取系统主题偏好
 */
export const getSystemThemePreference = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * 监听系统主题变化
 */
export const watchSystemThemeChange = (callback: (isDark: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
  }

  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handler);
    }
  };
};

/**
 * 检查是否支持主题
 */
export const isThemeSupported = (): boolean => {
  if (typeof window === 'undefined') return false;

  return (
    'CSS' in window &&
    'supports' in window.CSS &&
    window.CSS.supports('--test', '0')
  );
};

/**
 * 获取最佳主题（基于系统偏好）
 */
export const getOptimalTheme = (): ThemeMode => {
  return getSystemThemePreference();
};

/**
 * 主题相关的事件类型
 */
export interface ThemeChangeEvent {
  mode: ThemeMode;
}

/**
 * 监听主题变化事件
 */
export const onThemeChange = (callback: (event: ThemeChangeEvent) => void): (() => void) => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<ThemeChangeEvent>;
    callback(customEvent.detail);
  };

  window.addEventListener('themechange', handler as EventListener);

  return () => {
    window.removeEventListener('themechange', handler as EventListener);
  };
};

/**
 * 预加载主题资源
 */
export const preloadThemeResources = (mode: ThemeMode): void => {
  if (typeof document === 'undefined') return;

  // 预加载主题相关的 CSS
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = `/themes/${mode}.css`;
  link.onload = () => {
    document.head.removeChild(link);
  };
  document.head.appendChild(link);
};

/**
 * 批量设置 CSS 变量
 */
export const setCssVariables = (variables: Record<string, string>): void => {
  if (typeof document === 'undefined') return;

  Object.entries(variables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
};

/**
 * 重置所有 CSS 变量
 */
export const resetCssVariables = (): void => {
  if (typeof document === 'undefined') return;

  const computedStyle = getComputedStyle(document.documentElement);
  const variables = Array.from(computedStyle)
    .filter(name => name.startsWith('--'))
    .map(name => [name, '']);

  setCssVariables(Object.fromEntries(variables));
};

/**
 * 获取主题配置
 */
export const getThemeConfig = () => {
  return {
    mode: getCurrentTheme(),
    colors: {
      primary: getThemeColor('color-primary'),
      success: getThemeColor('color-success'),
      warning: getThemeColor('color-warning'),
      error: getThemeColor('color-error'),
      info: getThemeColor('color-info'),
    },
    backgrounds: {
      primary: getThemeColor('bg-primary'),
      secondary: getThemeColor('bg-secondary'),
      tertiary: getThemeColor('bg-tertiary'),
    },
    text: {
      primary: getThemeColor('text-primary'),
      secondary: getThemeColor('text-secondary'),
      tertiary: getThemeColor('text-tertiary'),
    },
  };
};

export default {
  getCurrentTheme,
  isDarkMode,
  isLightMode,
  getCssVariable,
  setCssVariable,
  getThemeColor,
  toggleTheme,
  setTheme,
  addThemeTransition,
  removeThemeTransition,
  toggleThemeWithAnimation,
  getSystemThemePreference,
  watchSystemThemeChange,
  isThemeSupported,
  getOptimalTheme,
  onThemeChange,
  preloadThemeResources,
  setCssVariables,
  resetCssVariables,
  getThemeConfig,
};
