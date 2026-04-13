/**
 * 主题系统 CSS 变量类型定义
 *
 * 此文件定义了所有可用的 CSS 主题变量，用于类型提示和文档化
 * 在开发组件时，可以参考这些变量名称
 */

/**
 * 背景颜色变量
 */
export type BackgroundVars =
  | '--bg-primary'        // 主背景色（日间 #ffffff，夜间 #141414）
  | '--bg-secondary'      // 次要背景色（日间 #f5f5f5，夜间 #1f1f1f）
  | '--bg-tertiary'       // 第三背景色（日间 #fafafa，夜间 #262626）
  | '--bg-elevated'       // 浮层背景色
  | '--bg-overlay';       // 遮罩背景色

/**
 * 文字颜色变量
 */
export type TextVars =
  | '--text-primary'      // 主要文字（日间 #262626，夜间 #e6e6e6）
  | '--text-secondary'    // 次要文字（日间 #595959，夜间 #bfbfbf）
  | '--text-tertiary'     // 辅助文字（日间 #8c8c8c，夜间 #8c8c8c）
  | '--text-quaternary'   // 禁用文字
  | '--text-disabled';    // 禁用状态

/**
 * 边框颜色变量
 */
export type BorderVars =
  | '--border-color'           // 主边框色（日间 #f0f0f0，夜间 #3d3d3d）
  | '--border-color-secondary'; // 次边框色（日间 #e8e8e8，夜间 #2d2d2d）

/**
 * 品牌色变量
 */
export type ColorVars =
  | '--color-primary'          // 主色调（橙色 #ff6b35）
  | '--color-primary-hover'    // 悬停色
  | '--color-primary-active'   // 激活色
  | '--color-primary-bg'       // 主色背景
  | '--color-primary-bg-hover' // 主色背景悬停
  | '--color-success'          // 成功色（绿色 #52c41a）
  | '--color-warning'          // 警告色（黄色 #faad14）
  | '--color-error'            // 错误色（红色 #ff4d4f）
  | '--color-info';            // 信息色（蓝色 #1890ff）

/**
 * 组件特定变量
 */
export type ComponentVars =
  | '--navbar-bg'             // 导航栏背景
  | '--navbar-bg-scrolled'    // 滚动后导航栏背景
  | '--navbar-border'         // 导航栏边框
  | '--card-bg'               // 卡片背景
  | '--card-bg-hover'         // 卡片悬停背景
  | '--input-bg'              // 输入框背景
  | '--modal-bg'              // 模态框背景
  | '--dropdown-bg'           // 下拉菜单背景
  | '--popover-bg';           // 气泡卡片背景

/**
 * 阴影变量
 */
export type ShadowVars =
  | '--shadow-1'        // 小阴影
  | '--shadow-2'        // 中阴影
  | '--shadow-3'        // 大阴影
  | '--shadow-primary'; // 主色阴影

/**
 * 渐变变量
 */
export type GradientVars =
  | '--gradient-primary' // 主色渐变
  | '--gradient-warm'    // 暖色渐变
  | '--gradient-bg';     // 背景渐变

/**
 * 所有 CSS 变量的联合类型
 */
export type AllCSSVars =
  | BackgroundVars
  | TextVars
  | BorderVars
  | ColorVars
  | ComponentVars
  | ShadowVars
  | GradientVars;

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark';

/**
 * 主题对比度
 */
export type ThemeContrast = 'normal' | 'high';

/**
 * 字体缩放
 */
export type ThemeFontScale = 'small' | 'medium' | 'large';

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  mode: ThemeMode;
  contrast: ThemeContrast;
  fontScale: ThemeFontScale;
  reduceMotion: boolean;
}

/**
 * 获取 CSS 变量值的辅助函数类型
 */
export type GetCSSVar = (varName: AllCSSVars) => string;

/**
 * 使用示例：
 *
 * ```tsx
 * import type { TextVars, BackgroundVars } from '@/types/theme';
 *
 * const textColor: TextVars = '--text-primary';
 * const bgColor: BackgroundVars = '--card-bg';
 *
 * <div style={{
 *   color: `var(${textColor})`,
 *   backgroundColor: `var(${bgColor})`
 * }}>
 *   内容
 * </div>
 * ```
 */
