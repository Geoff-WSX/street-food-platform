# Git Hooks

这个目录包含了项目的 Git hooks，用于在提交前自动检查代码质量。

## 安装 Hooks

克隆项目后，运行以下命令来安装 hooks：

```bash
# 方法 1: 使用 core.hooksPath 配置（推荐）
git config core.hooksPath .githooks

# 方法 2: 或者手动复制到 .git/hooks
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 可用的 Hooks

### pre-commit

在每次提交前自动运行：
- TypeScript 类型检查
- ESLint 代码检查
- 常见问题检测（console.log、TODO、any 类型等）

## 跳过检查

如果需要跳过检查，使用 `--no-verify` 标志：

```bash
git commit --no-verify -m "message"
```
