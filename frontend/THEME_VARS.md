# 🎨 主题变量快速参考

## 🚀 快速开始

在组件中使用主题变量：

```tsx
<div style={{
  color: 'var(--text-primary)',
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  padding: 'var(--spacing-md)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-sm)'
}}>
  内容
</div>
```

## 📊 变量分类

### 🎨 背景变量

| 变量名 | 日间模式 | 夜间模式 | 用途 |
|--------|---------|---------|------|
| `--bg-primary` | `#ffffff` | `#141414` | 主背景色 |
| `--bg-secondary` | `#f5f5f5` | `#1f1f1f` | 次要背景色 |
| `--bg-tertiary` | `#fafafa` | `#262626` | 第三背景色 |
| `--bg-elevated` | `#ffffff` | `#262626` | 浮层背景色 |
| `--bg-overlay` | `rgba(0,0,0,0.45)` | `rgba(0,0,0,0.65)` | 遮罩背景色 |

### ✏️ 文字变量

| 变量名 | 日间模式 | 夜间模式 | 用途 |
|--------|---------|---------|------|
| `--text-primary` | `#262626` | `#e6e6e6` | 主要文字 |
| `--text-secondary` | `#595959` | `#bfbfbf` | 次要文字 |
| `--text-tertiary` | `#8c8c8c` | `#8c8c8c` | 辅助文字 |
| `--text-quaternary` | `#bfbfbf` | `#595959` | 禁用文字 |
| `--text-disabled` | `#d9d9d9` | `#4d4d4d` | 禁用状态 |

### 🖼️ 边框变量

| 变量名 | 日间模式 | 夜间模式 | 用途 |
|--------|---------|---------|------|
| `--border-color` | `#f0f0f0` | `#3d3d3d` | 主边框色 |
| `--border-color-secondary` | `#e8e8e8` | `#2d2d2d` | 次边框色 |

### 🎯 品牌色

| 变量名 | 颜色值 | 用途 |
|--------|--------|------|
| `--color-primary` | `#ff6b35` | 主色调（橙色） |
| `--color-primary-hover` | `#ff8c5a` | 悬停色 |
| `--color-primary-active` | `#e55a2b` | 激活色 |
| `--color-primary-bg` | `rgba(255,107,53,0.1)` | 主色背景（日间） |
| `--color-primary-bg` | `rgba(255,107,53,0.15)` | 主色背景（夜间） |
| `--color-success` | `#52c41a` | 成功色（绿色） |
| `--color-warning` | `#faad14` | 警告色（黄色） |
| `--color-error` | `#ff4d4f` | 错误色（红色） |
| `--color-info` | `#1890ff` | 信息色（蓝色） |

### 🏗️ 组件变量

| 变量名 | 日间模式 | 夜间模式 | 用途 |
|--------|---------|---------|------|
| `--navbar-bg` | `rgba(255,255,255,0.95)` | `rgba(20,20,20,0.95)` | 导航栏背景 |
| `--navbar-bg-scrolled` | `rgba(255,255,255,0.98)` | `rgba(20,20,20,0.98)` | 滚动后导航栏 |
| `--navbar-border` | `rgba(255,107,53,0.1)` | `rgba(255,107,53,0.2)` | 导航栏边框 |
| `--card-bg` | `#ffffff` | `#1f1f1f` | 卡片背景 |
| `--card-bg-hover` | `#fafafa` | `#262626` | 卡片悬停背景 |
| `--input-bg` | `#ffffff` | `#262626` | 输入框背景 |
| `--modal-bg` | `rgba(255,255,255,0.98)` | `rgba(31,31,31,0.98)` | 模态框背景 |
| `--dropdown-bg` | `rgba(255,255,255,0.98)` | `rgba(31,31,31,0.98)` | 下拉菜单背景 |
| `--popover-bg` | `rgba(255,255,255,0.98)` | `rgba(31,31,31,0.98)` | 气泡卡片背景 |

### 🌑 阴影变量

| 变量名 | 日间模式 | 夜间模式 | 用途 |
|--------|---------|---------|------|
| `--shadow-1` | `0 2px 8px rgba(0,0,0,0.08)` | `0 2px 8px rgba(0,0,0,0.3)` | 小阴影 |
| `--shadow-2` | `0 4px 16px rgba(0,0,0,0.12)` | `0 4px 16px rgba(0,0,0,0.4)` | 中阴影 |
| `--shadow-3` | `0 6px 24px rgba(0,0,0,0.16)` | `0 6px 24px rgba(0,0,0,0.5)` | 大阴影 |
| `--shadow-primary` | `0 4px 16px rgba(255,107,53,0.2)` | `0 4px 16px rgba(255,107,53,0.3)` | 主色阴影 |

### 🎭 渐变变量

| 变量名 | 渐变值 | 用途 |
|--------|--------|------|
| `--gradient-primary` | `linear-gradient(135deg, #ff6b35 0%, #ff8e53 100%)` | 主色渐变 |
| `--gradient-warm` | `linear-gradient(135deg, #ff6b35 0%, #ffb347 100%)` | 暖色渐变 |
| `--gradient-bg` | 日间: `linear-gradient(135deg, #fff8f0 0%, #ffe8d6 100%)`<br>夜间: `linear-gradient(135deg, #1a1a1a 0%, #262626 100%)` | 背景渐变 |

## 📐 设计令牌（来自 designTokens.css）

### 间距系统

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--spacing-xs` | `4px` | 极小间距 |
| `--spacing-sm` | `8px` | 小间距 |
| `--spacing-md` | `16px` | 中等间距 |
| `--spacing-lg` | `24px` | 大间距 |
| `--spacing-xl` | `40px` | 超大间距 |
| `--spacing-xxl` | `60px` | 特大间距 |

### 圆角系统

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--radius-sm` | `8px` | 小圆角 |
| `--radius-md` | `12px` | 中等圆角 |
| `--radius-lg` | `16px` | 大圆角 |
| `--radius-xl` | `20px` | 超大圆角 |
| `--radius-full` | `9999px` | 完全圆角（圆形） |

### 字体大小

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--text-bite` | `12px` | 极小文字 |
| `--text-snack` | `14px` | 小文字 |
| `--text-meal` | `16px` | 正常文字 |
| `--text-platter` | `20px` | 大文字 |
| `--text-feast` | `28px` | 超大文字 |
| `--text-banquet` | `36px` | 特大文字 |

### 行高

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--lh-tight` | `1.25` | 紧凑行高 |
| `--lh-normal` | `1.5` | 正常行高 |
| `--lh-relaxed` | `1.75` | 宽松行高 |

### 动画时长

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--timing-fast` | `0.2s` | 快速动画 |
| `--timing-normal` | `0.3s` | 正常动画 |
| `--timing-slow` | `0.5s` | 慢速动画 |

## 🎯 使用场景示例

### 1. 卡片组件

```tsx
<div style={{
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--spacing-md)',
  boxShadow: 'var(--shadow-sm)',
  transition: 'all 0.3s ease'
}}>
  <h2 style={{ color: 'var(--text-primary)', fontSize: 'var(--text-platter)' }}>
    标题
  </h2>
  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-snack)' }}>
    内容
  </p>
</div>
```

### 2. 按钮组件

```tsx
<button style={{
  background: 'var(--gradient-primary)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--spacing-sm) var(--spacing-md)',
  fontSize: 'var(--text-snack)',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: 'var(--shadow-primary)'
}}>
  点击我
</button>
```

### 3. 输入框组件

```tsx
<input
  type="text"
  placeholder="请输入..."
  style={{
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-meal)',
    width: '100%'
  }}
/>
```

### 4. 导航栏

```tsx
<nav style={{
  backgroundColor: 'var(--navbar-bg)',
  borderBottom: '1px solid var(--navbar-border)',
  padding: 'var(--spacing-sm) var(--spacing-md)',
  backdropFilter: 'blur(10px)'
}}>
  <a href="#" style={{ color: 'var(--color-primary)' }}>首页</a>
  <a href="#" style={{ color: 'var(--text-primary)' }}>关于</a>
</nav>
```

### 5. 模态框

```tsx
<div style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'var(--bg-overlay)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 'var(--z-modal)'
}}>
  <div style={{
    backgroundColor: 'var(--modal-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-lg)',
    maxWidth: '500px',
    width: '90%',
    boxShadow: 'var(--shadow-3)'
  }}>
    <h2 style={{ color: 'var(--text-primary)' }}>标题</h2>
    <p style={{ color: 'var(--text-secondary)' }}>内容</p>
  </div>
</div>
```

## ⚠️ 常见错误

### ❌ 错误：硬编码颜色

```tsx
// 错误！暗色模式下不可见
<div style={{ color: '#262626' }}>文字</div>

// 正确
<div style={{ color: 'var(--text-primary)' }}>文字</div>
```

### ❌ 错误：固定背景色

```tsx
// 错误！暗色模式下太亮
<div style={{ backgroundColor: '#ffffff' }}>内容</div>

// 正确
<div style={{ backgroundColor: 'var(--card-bg)' }}>内容</div>
```

### ❌ 错误：固定边框颜色

```tsx
// 错误！暗色模式下不明显
<div style={{ border: '1px solid #e8e8e8' }}>内容</div>

// 正确
<div style={{ border: '1px solid var(--border-color-secondary)' }}>内容</div>
```

## 🔍 调试技巧

### 1. 检查当前主题

```tsx
const { mode } = useThemeStore();
console.log('当前主题:', mode);
```

### 2. 查看变量值

```javascript
// 在浏览器控制台
getComputedStyle(document.documentElement)
  .getPropertyValue('--text-primary')
  .trim(); // 返回当前主题的文字颜色
```

### 3. 切换主题测试

```tsx
// 手动触发主题切换
import { useThemeStore } from '@/store/theme';

const { toggleTheme } = useThemeStore();
toggleTheme(); // 切换主题
```

---

**维护者**：UI Designer Agent  
**最后更新**：2026-04-12  
**版本**：1.0.0
