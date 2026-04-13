# 街头美食平台前端测试指南

## 测试框架和工具

本项目使用以下测试框架和工具：
- **Vitest**: 测试运行器
- **Testing Library**: React 组件测试工具
- **jsdom**: 浏览器环境模拟
- **User Event**: 用户交互模拟

## 测试文件结构

```
frontend/
├── src/
│   ├── components/
│   │   └── __tests__/          # 组件测试
│   │       ├── PostCard.test.tsx
│   │       ├── CommentSection.test.tsx
│   │       ├── ChatModal.test.tsx
│   │       ├── NotificationBell.test.tsx
│   │       └── Navbar.test.tsx
│   └── test/                   # 测试工具和配置
│       ├── setup.ts            # 测试环境设置
│       ├── utils.tsx           # 测试工具函数
│       └── mocks/              # API 和 Store 模拟
│           ├── api.ts
│           └── stores.ts
├── vitest.config.ts            # Vitest 配置
└── package.json                # 测试脚本
```

## 测试命令

```bash
# 运行所有测试
npm run test

# 运行测试并显示 UI 界面
npm run test:ui

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm run test -- PostCard.test.tsx

# 监听模式（自动重新运行）
npm run test -- --watch
```

## 测试覆盖的功能

### PostCard 组件
- ✅ 基础渲染（内容、图片、地址、用户信息）
- ✅ 用户交互（点赞、收藏、评论、关注）
- ✅ 加载状态（图片加载、按钮禁用）
- ✅ 弹窗显示（用户资料、地图、聊天）
- ✅ 边缘情况（长地址、无图片、零计数）

### CommentSection 组件
- ✅ 评论列表渲染和分页
- ✅ 发表评论（验证、内容审查）
- ✅ 评论交互（点赞、回复、删除）
- ✅ 回复功能
- ✅ 错误处理

### ChatModal 组件
- ✅ 消息显示和发送
- ✅ 搜索功能
- ✅ 消息操作（删除、撤回）
- ✅ 用户操作（屏蔽、举报）
- ✅ 实时状态更新

### NotificationBell 组件
- ✅ 通知列表显示
- ✅ 未读计数
- ✅ 通知类型（评论、点赞、关注）
- ✅ 批量操作（全部已读）
- ✅ 定时轮询

### Navbar 组件
- ✅ 导航菜单
- ✅ 用户认证状态
- ✅ 消息和通知
- ✅ 主题切换
- ✅ 响应式设计

## 测试最佳实践

### 1. 组件测试结构

```typescript
describe('ComponentName', () => {
  // 设置和清理
  beforeEach(() => {
    // 准备测试环境
  })

  afterEach(() => {
    // 清理副作用
  })

  // 分组测试
  describe('Rendering', () => {
    it('should render...', () => {
      // 渲染测试
    })
  })

  describe('User Interactions', () => {
    it('should handle...', async () => {
      // 交互测试
    })
  })

  describe('Edge Cases', () => {
    it('should handle...', () => {
      // 边缘情况测试
    })
  })
})
```

### 2. Mock 使用

```typescript
// Mock API
vi.mock('../../api/post', () => ({
  toggleLike: vi.fn(),
  toggleFavorite: vi.fn(),
}))

// Mock Store
vi.mock('../../store/auth', () => ({
  useAuthStore: vi.fn(),
}))

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})
```

### 3. 测试工具函数

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// 渲染组件
const { container } = render(<Component />)

// 查找元素
const element = screen.getByText('text')
const button = screen.getByRole('button')

// 用户交互
await userEvent.click(button)
await userEvent.type(input, 'text')

// 等待异步操作
await waitFor(() => {
  expect(element).toBeInTheDocument()
})
```

## 测试覆盖率目标

- 整体代码覆盖率：> 80%
- 核心组件覆盖率：> 90%
- 关键业务逻辑覆盖率：> 95%

## 常见问题和解决方案

### 1. Mock 问题

如果遇到模块找不到的错误，检查：
- Mock 路径是否正确
- 模块是否实际存在
- 是否使用了正确的 mock 语法

### 2. 异步测试

使用 `waitFor` 处理异步操作：
```typescript
await waitFor(() => {
  expect(mockFunction).toHaveBeenCalled()
}, { timeout: 3000 })
```

### 3. Store 测试

使用 Zustand 的测试模式：
```typescript
const mockStore = create((set) => ({
  // store state
}))

vi.mock('../../store/auth', () => ({
  useAuthStore: (selector) => selector(mockStore),
}))
```

## 运行测试注意事项

1. 确保依赖已安装：`npm install`
2. 确保测试数据库已配置（如需要）
3. 运行测试前先构建项目：`npm run build`
4. 清理测试缓存：`rm -rf node_modules/.vite`

## 持续集成

测试会在以下情况自动运行：
- Pull Request 创建或更新
- 代码推送到主分支
- 发布新版本之前

确保所有测试通过后再合并代码！
