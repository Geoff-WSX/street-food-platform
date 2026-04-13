# 🎨 主题系统使用指南

## 📋 概述

本项目使用 CSS 变量 + Ant Design Theme 的混合主题系统，确保所有页面和组件在日夜模式下统一变化。

## 🔧 技术架构

### 1. CSS 变量系统（主要）
定义在 `/frontend/src/styles/theme.css`，提供完整的颜色、背景、边框等变量。

### 2. Ant Design 主题配置（辅助）
在 `App.tsx` 中配置，确保 Ant Design 组件样式与 CSS 变量同步。

### 3. Zustand 状态管理
在 `/frontend/src/store/theme.ts` 中管理主题状态和切换逻辑。

## 🎯 核心设计原则

### ✅ 正确做法

```tsx
/* 1. 使用 CSS 变量 */
<div style={{ color: 'var(--text-primary)' }}>
  文字内容
</div>

/* 2. 使用语义化变量 */
<div style={{ 
  backgroundColor: 'var(--card-bg)',
  borderColor: 'var(--border-color)',
  padding: 'var(--spacing-md)'
 }}>
  卡片内容
</div>

/* 3. 动态类名 */
<div className={mode === 'dark' ? 'dark-mode' : 'light-mode'}>
  内容
</div>
```

### ❌ 错误做法

```tsx
/* 1. 硬编码颜色值 */
<div style={{ color: '#262626' }}>  // 暗色模式下不可见！
  文字内容
</div>

/* 2. 使用固定背景色 */
<div style={{ backgroundColor: '#ffffff' }}>  // 暗色模式下太亮！
  内容
</div>

/* 3. 使用 Ant Design token 但未更新主题配置 */
<div style={{ color: token.colorText }}>  // 需要确保 App.tsx 中的主题配置正确
  内容
</div>
```

## 🎨 可用的 CSS 变量

### 基础颜色
```css
--bg-primary:        主背景色
--bg-secondary:      次要背景色
--bg-tertiary:       第三背景色
--bg-elevated:       浮层背景色
--bg-overlay:        遮罩背景色
```

### 文字颜色
```css
--text-primary:      主要文字
--text-secondary:    次要文字
--text-tertiary:     辅助文字
--text-quaternary:   禁用文字
--text-disabled:     禁用状态
```

### 边框颜色
```css
--border-color:          主边框色
--border-color-secondary: 次边框色
```

### 品牌色
```css
--color-primary:           主色调（橙色 #ff6b35）
--color-primary-hover:     悬停色
--color-primary-active:    激活色
--color-primary-bg:        主色背景
--color-primary-bg-hover:  主色背景悬停
```

### 功能色
```css
--color-success:  成功色（绿色）
--color-warning:  警告色（黄色）
--color-error:    错误色（红色）
--color-info:     信息色（蓝色）
```

### 组件特定
```css
--navbar-bg:          导航栏背景
--navbar-bg-scrolled: 滚动后导航栏背景
--navbar-border:      导航栏边框
--card-bg:            卡片背景
--card-bg-hover:      卡片悬停背景
--input-bg:           输入框背景
--modal-bg:           模态框背景
--dropdown-bg:        下拉菜单背景
--popover-bg:         气泡卡片背景
```

### 阴影
```css
--shadow-1:        小阴影
--shadow-2:        中阴影
--shadow-3:        大阴影
--shadow-primary:  主色阴影
```

### 渐变
```css
--gradient-primary: 主色渐变
--gradient-warm:    暖色渐变
--gradient-bg:      背景渐变
```

## 🔄 主题切换组件

### 基础用法
```tsx
import ThemeSwitcher from './components/ThemeSwitcher';

// 默认圆形按钮
<ThemeSwitcher />

// 带标签
<ThemeSwitcher showLabel />

// 自定义尺寸
<ThemeSwitcher size="small" />
<ThemeSwitcher size="middle" />
<ThemeSwitcher size="large" />

// 自定义样式
<ThemeSwitcher 
  style={{ marginTop: 16 }}
  className="custom-theme-switcher"
/>
```

### 在 Navbar 中使用
```tsx
import ThemeSwitcher from './components/ThemeSwitcher';

<Space size={16}>
  {/* 其他按钮 */}
  
  {/* 主题切换按钮 */}
  <ThemeSwitcher size="middle" />
  
  {/* 用户菜单 */}
</Space>
```

## 🛠️ 常见问题修复

### 问题 1：暗色模式下文字不可见
**原因**：使用了硬编码的颜色值如 `#262626`

**解决方案**：
```tsx
// ❌ 错误
<div style={{ color: '#262626' }}>文字</div>

// ✅ 正确
<div style={{ color: 'var(--text-primary)' }}>文字</div>
```

### 问题 2：暗色模式下背景太亮
**原因**：使用了固定的白色背景

**解决方案**：
```tsx
// ❌ 错误
<div style={{ backgroundColor: '#ffffff' }}>内容</div>

// ✅ 正确
<div style={{ backgroundColor: 'var(--card-bg)' }}>内容</div>
```

### 问题 3：Ant Design 组件颜色不正确
**原因**：未在 App.tsx 中正确配置主题

**解决方案**：
已在 App.tsx 中配置了正确的主题算法：
```tsx
algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm
```

### 问题 4：内联样式中的边框颜色错误
**原因**：使用了硬编码的边框颜色

**解决方案**：
```tsx
// ❌ 错误
<div style={{ border: '1px solid #e8e8e8' }}>内容</div>

// ✅ 正确
<div style={{ border: '1px solid var(--border-color-secondary)' }}>内容</div>
```

## 📝 开发检查清单

在开发新组件或页面时，请确保：

- [ ] 所有颜色使用 CSS 变量，不硬编码颜色值
- [ ] 背景色使用 `var(--bg-*)` 或 `var(--card-bg)` 等变量
- [ ] 文字颜色使用 `var(--text-*)` 变量
- [ ] 边框颜色使用 `var(--border-*)` 变量
- [ ] 在日间和夜间模式下测试视觉效果
- [ ] 确保对比度符合 WCAG AA 标准（4.5:1）

## 🎯 最佳实践

### 1. 创建可复用的样式变量
```tsx
// styles/componentStyles.ts
export const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--spacing-md)',
};

// 使用
<div style={cardStyle}>内容</div>
```

### 2. 使用 Tailwind CSS 风格的工具类
```tsx
// 已在 designTokens.css 中定义
<div className="card-trendy pad-md radius-md shadow-sm">
  内容
</div>
```

### 3. 条件性应用主题相关样式
```tsx
const { mode } = useThemeStore();

<div style={{
  background: mode === 'dark' 
    ? 'linear-gradient(135deg, #1a1a1a 0%, #1f1f1f 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'
}}>
  内容
</div>
```

## 🧪 测试主题切换

### 手动测试
1. 点击导航栏的主题切换按钮
2. 检查所有页面的背景和文字颜色是否正确变化
3. 特别关注以下页面：
   - 首页（美食卡片列表）
   - 个人主页（用户信息、统计数据）
   - 消息页面（聊天列表）
   - 管理后台（表格、表单）

### 自动化测试（未来）
```tsx
// TODO: 添加主题切换的自动化测试
describe('Theme Switching', () => {
  it('should toggle between light and dark mode', () => {
    // 测试逻辑
  });
});
```

---

**维护者**：UI Designer Agent
**最后更新**：2026-04-12
**版本**：1.0.0
