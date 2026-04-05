# 街边美食平台 - 启动脚本使用指南

## 🚀 快速启动

### 方式1：使用启动脚本（推荐）

```bash
cd /Users/Zhuanz/street-food-platform
./scripts/start.sh
```

**启动脚本会自动：**
1. ✅ 运行健康检查
2. ✅ 清理端口占用
3. ✅ 启动后端服务（端口 3000）
4. ✅ 启动前端服务（端口 5176）
5. ✅ **启动自动化 Bug 修复循环系统** 🆕

### 方式2：手动启动

```bash
# 后端
cd /Users/Zhuanz/street-food-platform/backend
npm run dev

# 前端（新终端）
cd /Users/Zhuanz/street-food-platform/frontend
npm run dev
```

---

## 🛑 停止服务

### 使用停止脚本（推荐）

```bash
cd /Users/Zhuanz/street-food-platform
./scripts/stop.sh
```

**停止脚本会自动：**
1. ✅ 停止后端服务
2. ✅ 停止前端服务
3. ✅ **停止自动化 Bug 修复系统** 🆕

### 手动停止

```bash
# 查看并停止进程
lsof -ti:3000 | xargs kill -9  # 后端
lsof -ti:5176 | xargs kill -9  # 前端
```

---

## 🤖 自动化 Bug 修复系统 🆕

### 系统概述

完整的 Bug 修复闭环系统，自动发现、分析、规划、修复和验证代码问题：

```
Bug 排查 → Bug 分析 → 方案规划 → 执行修复 → 修复验证 → 循环
```

### 启动自动化系统

```bash
# 随项目自动启动
./scripts/start.sh

# 或单独启动
./scripts/auto-fix-loop.sh
```

### 监控系统状态

```bash
# 实时监控面板
./scripts/monitor-fix.sh
```

**监控面板显示：**
- 📊 系统运行状态
- 📈 修复统计数据
- 📝 最新日志
- 🐛 发现的问题
- 🎮 操作命令

### 测试自动化系统

```bash
# 运行完整测试
./scripts/test-auto-fix.sh
```

### 自动化功能

系统每 60 秒自动：

1. 🔍 检查代码问题
2. 📊 分析问题优先级
3. 📋 规划修复方案（P0/P1 问题）
4. 🔧 执行自动修复
5. ✅ 验证修复结果
6. 🔄 继续循环

**停止条件：**
- 手动运行 `./scripts/stop.sh`
- 项目服务停止

### 查看自动化日志

```bash
# 主日志
tail -f logs/auto-fix/auto-fix.log

# 系统状态
cat logs/auto-fix/state.json

# 排查报告
ls -lt logs/bug-detection-report-*.md
```

---

## 📋 健康检查

### 单独运行健康检查

```bash
cd /Users/Zhuanz/street-food-platform
./scripts/start-health-check.sh
```

**检查项目：**
- 📦 Node.js 和 npm 版本
- 🔧 后端依赖安装状态
- 🎨 前端依赖安装状态
- 🗄️ Prisma Client 生成状态
- 🌐 端口占用情况（3000, 5176）
- 🔍 代码质量（ESLint）

### 查看日志

```bash
# 健康检查日志
ls -la /Users/Zhuanz/street-food-platform/logs/

# 服务日志
tail -f /Users/Zhuanz/street-food-platform/logs/backend.log
tail -f /Users/Zhuanz/street-food-platform/logs/frontend.log
```

---

## 🔧 Claude Code 自动化

### 已配置的自动化功能

当您在项目中打开 Claude Code 时，会自动运行：

1. **SessionStart Hook** - 会话开始时自动运行健康检查
2. **Bug 排查技能** - 可手动触发进行全面排查
3. **代码审查技能** - Edit/Write 后自动审查代码 🆕
4. **质量检查 Hook** - 代码修改后自动检查质量 🆕

### 可用技能

```bash
# Bug 排查
使用 bug-detection 技能进行全面排查

# Bug 分析
使用 bug-analysis 技能分析报告

# 方案规划
使用 bug-fix-planner 技能规划修复

# 执行修复
使用 bug-fix-agent 执行修复

# 修复验证
使用 bug-verification 验证修复
```

---

## 📊 服务地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API | http://localhost:3000 | Express + TypeScript |
| 前端界面 | http://localhost:5176 | React + Vite |
| WebSocket | ws://localhost:3000/ws | 实时通信 |

---

## 🐛 故障排查

### 端口被占用

```bash
# 查看占用进程
lsof -i:3000
lsof -i:5176

# 强制停止
./scripts/stop.sh
```

### 依赖问题

```bash
# 重新安装后端依赖
cd /Users/Zhuanz/street-food-platform/backend
rm -rf node_modules
npm install

# 重新安装前端依赖
cd /Users/Zhuanz/street-food-platform/frontend
rm -rf node_modules
npm install
```

### 数据库问题

```bash
cd /Users/Zhuanz/street-food-platform/backend
npm run prisma:generate
npm run prisma:migrate
```

---

## 📝 日志位置

```
/Users/Zhuanz/street-food-platform/logs/
├── backend.log              # 后端服务日志
├── frontend.log             # 前端服务日志
├── startup-check-*.log      # 健康检查日志
└── auto-fix/                # 自动化系统日志 🆕
    ├── auto-fix.log         # 主日志
    ├── state.json           # 系统状态
    └── detection-*.md       # 排查报告
```

---

## 📚 详细文档

- [Bug 修复自动化系统完整指南](../docs/AUTO_FIX_GUIDE.md)

---

## 🔐 权限配置

脚本已设置为可执行：

```bash
chmod +x /Users/Zhuanz/street-food-platform/scripts/*.sh
```

如果遇到权限问题，重新运行上述命令。
