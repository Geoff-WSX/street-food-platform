import { useEffect, useRef } from 'react';
import { useThemeStore } from '../store/theme';

/**
 * 主题性能优化 Hook
 * 防止主题切换时的性能问题
 */
export const useThemePerformance = () => {
  const { mode } = useThemeStore();
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // 取消之前的动画帧
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // 使用 requestAnimationFrame 优化主题切换
    rafRef.current = requestAnimationFrame(() => {
      // 更新 CSS 变量和 DOM 属性
      document.documentElement.setAttribute('data-theme', mode);

      // 批量更新 DOM，避免重排
      document.body.style.display = 'none';
      document.body.offsetHeight; // 强制重排
      document.body.style.display = '';
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [mode, rafRef]);
};

/**
 * 主题懒加载 Hook
 * 延迟加载主题相关资源
 */
export const useThemeLazyLoad = () => {
  const { mode } = useThemeStore();
  const loadedThemes = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 如果当前主题已加载，跳过
    if (loadedThemes.current.has(mode)) {
      return;
    }

    // 模拟懒加载主题资源
    const loadThemeResources = async () => {
      // 这里可以预加载主题相关的图片、字体等资源
      console.log(`懒加载主题资源: ${mode}`);

      // 标记为已加载
      loadedThemes.current.add(mode);
    };

    loadThemeResources();
  }, [mode]);
};

/**
 * 主题缓存 Hook
 * 缓存主题计算结果
 */
export const useThemeCache = () => {
  const { mode } = useThemeStore();
  const cache = useRef<Map<string, any>>(new Map());

  const getCachedValue = <T,>(key: string, compute: () => T): T => {
    const cacheKey = `${mode}-${key}`;

    if (!cache.current.has(cacheKey)) {
      cache.current.set(cacheKey, compute());
    }

    return cache.current.get(cacheKey) as T;
  };

  const clearCache = () => {
    cache.current.clear();
  };

  useEffect(() => {
    // 主题切换时清除缓存
    clearCache();
  }, [mode]);

  return {
    getCachedValue,
    clearCache,
  };
};

/**
 * 主题预加载 Hook
 * 预加载下一个可能使用的主题
 */
export const useThemePreload = () => {
  const { mode } = useThemeStore();

  useEffect(() => {
    // 预加载另一个主题的资源
    const nextTheme = mode === 'light' ? 'dark' : 'light';

    // 使用 Intersection Observer 或其他技术预加载
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'style';
    preloadLink.href = `/themes/${nextTheme}.css`; // 假设有主题特定的 CSS 文件

    document.head.appendChild(preloadLink);

    return () => {
      document.head.removeChild(preloadLink);
    };
  }, [mode]);
};

/**
 * 主题性能监控 Hook
 * 监控主题切换的性能
 */
export const useThemePerformanceMonitor = () => {
  const { mode } = useThemeStore();

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 如果主题切换耗时超过 100ms，发出警告
      if (duration > 100) {
        console.warn(`主题切换耗时: ${duration.toFixed(2)}ms`);
      }

      // 发送到分析服务
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'theme_switch', {
          theme: mode,
          duration: duration,
        });
      }
    };
  }, [mode]);
};

export default useThemePerformance;
