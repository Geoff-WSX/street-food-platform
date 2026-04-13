# 项目：街头美食社交平台（Web 版）

## 技术栈约束
- 前端：React 19 + TypeScript + Vite + Ant Design + Zustand
- 后端：Express + TypeScript + Prisma ORM + MySQL
- 实时：WebSocket (ws 库)
- AI：OpenAI GPT-4o-mini
- 图片：本地文件上传 + Sharp 压缩

## 端口配置
- 后端 API：**3000**（前端通过 `/api` 访问）
- 前端开发服务器：**5176**（Vite 端口）

## 关联项目
- 小程序项目：`/Users/Zhuanz/street-food-platform-miniprogram`
- 两个项目各自有独立后端，**共享同一 MySQL 数据库**
- 后端改动只影响本项目，不影响小程序项目
- 数据库表结构改动需同步到两个后端

---

## 🎯 Agent 使用策略

### 前端开发 (frontend/src/)
推荐代理：
- `Frontend Developer` - React 组件开发、性能优化
- `UI Designer` - 界面设计、组件库扩展
- `UX Researcher` - 用户体验优化、交互改进
- `Code Reviewer` - 代码审查、质量检查

调用示例：
```
使用 Frontend Developer 代理开发一个美食卡片组件。
使用 UI Designer 代理优化首页布局。
```

### 后端开发 (backend/src/)
推荐代理：
- `Backend Architect` - API 设计、架构优化
- `Database Optimizer` - 数据库查询优化、索引设计
- `Security Engineer` - 后端安全审查、漏洞检测
- `AI Engineer` - AI 功能开发、GPT-4o-mini 集成

调用示例：
```
使用 Backend Architect 代理设计美食评论 API。
使用 Database Optimizer 代理优化首页查询性能。
```

### WebSocket 开发
推荐代理：
- `Backend Architect` - WebSocket 服务端设计
- `Frontend Developer` - WebSocket 客户端集成

### 测试与质量
推荐代理：
- `Code Reviewer` - PR 代码审查
- `Security Engineer` - 安全审计
- `Performance Benchmarker` - 性能测试
- `API Tester` - API 测试

---

## 全局修改规则（硬性约束）

### 1. 修改范围锁定
- 前端任务只允许修改 `frontend/src/` 下的文件
- 后端任务只允许修改 `backend/src/` 下的文件
- 数据库相关任务只允许修改 `backend/prisma/schema.prisma` 和 `backend/src/services/db/`
- WebSocket 相关任务只允许修改 `backend/src/websocket/` 和 `frontend/src/hooks/useWebSocket.ts`
- AI 相关任务只允许修改 `backend/src/services/ai/`

### 2. 数据库改动同步规则（重要）
- 如果改动涉及数据库表结构，需同时修改两个后端的 Prisma schema
- Web 项目 Prisma：`/Users/Zhuanz/street-food-platform/backend/prisma/schema.prisma`
- 小程序后端 Prisma：`/Users/Zhuanz/street-food-platform-miniprogram/backend/prisma/schema.prisma`
- 数据库改动后需执行 `npx prisma migrate` 和 `npx prisma generate`

### 3. API 改动规则
- 本项目 API 改动只影响 Web 项目前端
- 不影响小程序项目的 API 调用

### 3. 行为保持规则
- 不要改变现有函数的签名（参数名、类型、返回值）除非明确要求
- 不要重命名公共组件、hooks、服务类、API 路由
- 保持现有错误处理逻辑不变，只扩展不破坏

### 4. 测试与验证
- 前端：`npm run build`（Vite 构建检查）
- 后端：`npm run type-check`（TypeScript 编译）
- Prisma 修改后：`npx prisma validate` 和 `npx prisma generate`

---

## 禁止操作清单
- ❌ 禁止执行 `rm -rf`、`drop database`、`truncate table` 等破坏性命令
- ❌ 禁止直接修改生产环境配置文件
- ❌ 禁止修改 `node_modules`、`dist`、`build` 下的任何文件
- ❌ 禁止自动运行 `git push --force` 或 `git reset --hard`