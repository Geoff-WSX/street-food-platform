# 项目：街头美食社交平台

## 技术栈约束
- 前端：React 19 + TypeScript + Vite + Ant Design + Zustand
- 后端：Express + TypeScript + Prisma ORM + MySQL
- 实时：WebSocket (ws 库)
- AI：OpenAI GPT-4o-mini
- 图片：本地文件上传 + Sharp 压缩

## 全局修改规则（硬性约束）

### 1. 修改范围锁定
- 默认禁止修改任何与当前任务无关的模块。
- 前端任务只允许修改 `frontend/src/` 下的文件。
- 后端任务只允许修改 `backend/src/` 下的文件。
- 数据库相关任务只允许修改 `backend/prisma/schema.prisma` 和 `backend/src/services/db/`。
- WebSocket 相关任务只允许修改 `backend/src/websocket/` 和 `frontend/src/hooks/useWebSocket.ts`。
- AI 相关任务只允许修改 `backend/src/services/ai/`。

### 2. 禁止跨层修改
- 前端代码不能直接修改后端文件，反之亦然。
- 修改 API 接口时，必须同时更新前端对应的 API 调用代码（在同一 commit 内），但禁止触碰其他前端组件。

### 3. 行为保持规则
- 不要改变现有函数的签名（参数名、类型、返回值）除非明确要求。
- 不要重命名公共组件、hooks、服务类、API 路由。
- 不要删除或修改未在任务中提及的字段、属性、环境变量。
- 保持现有错误处理逻辑不变，只扩展不破坏。

### 4. 测试与验证
- 每次修改后必须运行相关测试（如果存在）：
  - 前端：`npm run test:frontend` 或 `npm run build`（Vite 构建检查）
  - 后端：`npm run test:backend` 或 `npm run type-check`（TypeScript 编译）
  - Prisma 修改后：`npx prisma validate` 和 `npx prisma generate`
- 如果连续 2 次测试失败，停止修改并报告原因。

### 5. 最小修改原则
- 优先使用精准的局部修改，而不是重构整个文件。
- 一次会话只解决一个明确定义的问题。
- 如果发现需要修改超过 3 个文件，请先输出修改计划并获得批准。

## 禁止操作清单
- ❌ 禁止执行 `rm -rf`、`drop database`、`truncate table` 等破坏性命令。
- ❌ 禁止直接修改生产环境配置文件（`.env.production`、`docker-compose.prod.yml`）。
- ❌ 禁止修改 `node_modules`、`dist`、`build` 下的任何文件。
- ❌ 禁止自动运行 `git push --force` 或 `git reset --hard`。

## 退出条件
- 当遇到以下情况时，立即停止并报告：
  - 修改导致 TypeScript 编译错误。
  - Prisma 客户端生成失败。
  - WebSocket 连接逻辑被破坏。
  - 图片上传或压缩功能异常。
