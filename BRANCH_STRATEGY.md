# Git 分支策略

## 分支结构

```
main          ← 主分支（生产环境）
  ↑
  └── merge   ← develop 合并到 main
develop       ← 开发分支
  ↑
  ├── merge   ← feature 合并到 develop
  └── merge   ← hotfix 合并到 develop

feature/*     ← 功能分支
hotfix/*      ← 紧急修复分支
```

## 分支说明

### main (主分支)
- **用途**: 生产环境代码
- **保护**: 只有经过审核的代码才能合并
- **标签**: 从此分支创建版本标签 (v1.0.0, v1.1.0...)

### develop (开发分支)
- **用途**: 开发环境代码
- **合并**: feature 分支完成后合并到此
- **测试**: 所有功能在此分支集成测试

### feature/* (功能分支)
- **命名**: `feature/功能名称`
- **来源**: 从 develop 分支创建
- **去向**: 完成后合并回 develop

### hotfix/* (紧急修复分支)
- **命名**: `hotfix/问题描述`
- **来源**: 从 main 分支创建
- **去向**: 修复后同时合并到 main 和 develop

## 工作流程

### 1. 开发新功能
```bash
# 从 develop 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/ai-chat-function

# 开发并提交
git add .
git commit -m "feat: 添加 AI 聊天功能"

# 推送到远程
git push -u origin feature/ai-chat-function

# 完成后合并到 develop
git checkout develop
git merge feature/ai-chat-function
git push origin develop
```

### 2. 修复紧急 Bug
```bash
# 从 main 创建修复分支
git checkout main
git pull origin main
git checkout -b hotfix/login-error

# 修复并提交
git add .
git commit -m "fix: 修复登录页面错误"

# 推送到远程
git push -u origin hotfix/login-error

# 完成后合并到 main 和 develop
git checkout main
git merge hotfix/login-error
git push origin main

git checkout develop
git merge hotfix/login-error
git push origin develop
```

### 3. 发布新版本
```bash
# 从 develop 合并到 main
git checkout main
git merge develop
git push origin main

# 创建版本标签
git tag -a v1.0.0 -m "版本 1.0.0"
git push origin v1.0.0
```

## Commit 消息规范

使用约定式提交 (Conventional Commits)：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例
```bash
feat(ai): 添加智能对话功能
fix(auth): 修复登录 token 过期问题
docs(readme): 更新安装说明
refactor(api): 重构用户 API 接口
```

## 当前分支状态

- `main`: ✅ 已推送到 GitHub
- `develop`: ✅ 已创建

## 下一步

1. 开发新功能时，从 `develop` 创建 `feature/*` 分支
2. 完成后合并回 `develop`
3. 定期将 `develop` 合并到 `main` 发布新版本
