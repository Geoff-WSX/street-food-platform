import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';
export type ThemeContrast = 'normal' | 'high';
export type ThemeFontScale = 'small' | 'medium' | 'large';

interface ThemeState {
  // 基础主题模式
  mode: ThemeMode;

  // 可访问性选项
  contrast: ThemeContrast;
  fontScale: ThemeFontScale;
  reduceMotion: boolean;

  // 操作方法
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setContrast: (contrast: ThemeContrast) => void;
  setFontScale: (scale: ThemeFontScale) => void;
  setReduceMotion: (reduce: boolean) => void;

  // 系统偏好检测
  detectSystemPreference: () => ThemeMode;
  followSystemPreference: () => void;
}

// 检测系统主题偏好
const detectSystemTheme = (): ThemeMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// 检测系统运动偏好
const detectReduceMotion = (): boolean => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      contrast: 'normal',
      fontScale: 'medium',
      reduceMotion: detectReduceMotion(),

      toggleTheme: () => set((state) => {
        const newMode = state.mode === 'light' ? 'dark' : 'light';
        return { mode: newMode };
      }),

      setTheme: (mode) => set({ mode }),

      setContrast: (contrast) => set({ contrast }),

      setFontScale: (fontScale) => set({ fontScale }),

      setReduceMotion: (reduceMotion) => set({ reduceMotion }),

      detectSystemPreference: () => detectSystemTheme(),

      followSystemPreference: () => set({ mode: detectSystemTheme() }),
    }),
    {
      name: 'theme-storage',
      version: 1,
    }
  )
);

// 应用主题到文档
export const applyTheme = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // 设置 data-theme 属性
  root.setAttribute('data-theme', mode);

  // 移除旧的主题类
  root.classList.remove('light-theme', 'dark-theme');

  // 添加新的主题类
  root.classList.add(`${mode}-theme`);

  // 触发自定义事件，让其他组件知道主题已更改
  window.dispatchEvent(new CustomEvent('themechange', { detail: { mode } }));
};

// 应用可访问性设置
export const applyAccessibilitySettings = (settings: {
  contrast: ThemeContrast;
  fontScale: ThemeFontScale;
  reduceMotion: boolean;
}) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // 应用对比度设置
  root.setAttribute('data-contrast', settings.contrast);

  // 应用字体缩放
  const fontScales = {
    small: '14px',
    medium: '16px',
    large: '18px'
  };
  root.style.fontSize = fontScales[settings.fontScale];

  // 应用减少动画设置
  root.setAttribute('data-reduced-motion', settings.reduceMotion.toString());
};

// 初始化主题
export const initTheme = () => {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem('theme-storage');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.mode) {
        applyTheme(state.mode);
      }
      if (state) {
        applyAccessibilitySettings({
          contrast: state.contrast || 'normal',
          fontScale: state.fontScale || 'medium',
          reduceMotion: state.reduceMotion || false
        });
      }
    } catch (e) {
      // 如果解析失败，使用默认值
      applyTheme('light');
      applyAccessibilitySettings({
        contrast: 'normal',
        fontScale: 'medium',
        reduceMotion: false
      });
    }
  } else {
    applyTheme('light');
    applyAccessibilitySettings({
      contrast: 'normal',
      fontScale: 'medium',
      reduceMotion: false
    });
  }

  // 监听系统主题变化
  if (window.matchMedia) {
    // 使用现代API添加监听器
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeQuery.addEventListener) {
      darkModeQuery.addEventListener('change', () => {
        // 系统主题变化处理
      });
    }
  }
};

// 主题工具函数
export const themeUtils = {
  // 获取当前主题模式
  getCurrentTheme: () => useThemeStore.getState().mode,

  // 检查是否为暗色模式
  isDark: () => useThemeStore.getState().mode === 'dark',

  // 获取主题颜色
  getThemeColor: (colorName: string) => {
    if (typeof document === 'undefined') return '#000000';
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${colorName}`)
      .trim() || '#000000';
  },

  // 切换主题（带动画）
  toggleWithAnimation: () => {
    const { toggleTheme } = useThemeStore.getState();

    // 添加过渡动画类
    if (typeof document !== 'undefined') {
      document.body.classList.add('theme-transitioning');

      setTimeout(() => {
        toggleTheme();
        setTimeout(() => {
          document.body.classList.remove('theme-transitioning');
        }, 300); // 等待过渡完成
      }, 50);
    }
  }
};