# 🍜 街边美食平台 (Street Food Platform)

一个发现和分享街边美食的社交应用，帮助用户探索城市中的美味小吃。

## ✨ 主要功能

### 🍽️ 美食探索
- 📍 基于地理位置的美食推荐
- 🔥 随机发现精选美食动态
- 🏙️ 支持多个城市的美食探索
- ⭐ 美食排行榜和热门推荐

### 👥 社交互动
- 💬 发布图文动态分享美食体验
- ❤️ 点赞、收藏喜欢的动态
- 💭 评论和回复功能
- 👤 关注用户、获取粉丝
- 📨 私信聊天功能

### 🤖 AI 助手 (小边)
- 🍜 美食模式：智能推荐美食、规划路线
- 🛠️ 管理模式：Bug排查、代码审查、系统管理
- 💡 智能对话和个性化建议

### 👨‍💻 管理后台
- 👥 用户管理（角色、状态）
- 📊 数据统计和分析
- 📝 举报审核系统
- 🔧 系统配置和监控

## 🛠️ 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **UI**: Ant Design
- **路由**: React Router
- **状态**: Zustand
- **地图**: 高德地图 API

### 后端
- **运行**: Node.js
- **框架**: Express
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **认证**: JWT

### AI
- **模型**: OpenAI GPT-4o-mini
- **功能**: 智能对话、美食推荐、代码审查

## 📦 项目结构

```
street-food-platform/
├── frontend/           # 前端应用
│   ├── src/
│   │   ├── api/       # API 接口
│   │   ├── components/# React 组件
│   │   ├── pages/     # 页面组件
│   │   ├── store/     # 状态管理
│   │   └── styles/    # 样式文件
│   └── package.json
│
├── backend/           # 后端应用
│   ├── prisma/        # 数据库 schema
│   ├── src/
│   │   ├── controllers/# 控制器
│   │   ├── services/  # 业务逻辑
│   │   ├── routes/    # 路由定义
│   │   ├── middleware/# 中间件
│   │   └── utils/     # 工具函数
│   └── package.json
│
└── .git/hooks/        # Git hooks
    └── pre-commit     # 提交前检查
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- PostgreSQL >= 14
- npm 或 yarn

### 安装依赖

```bash
# 前端
cd frontend
npm install

# 后端
cd ../backend
npm install
```

### 配置环境变量

创建 `backend/.env` 文件：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/street_food"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# 服务器
PORT=3001
NODE_ENV=development
```

### 安装 Git Hooks

```bash
# 配置 Git 使用项目的 hooks 目录
git config core.hooksPath .githooks

# 验证配置
git config --get core.hooksPath  # 应该输出 .githooks
```

> ⚠️ **重要**: 提交代码前，小边会自动检查代码质量。如需跳过检查，使用 `git commit --no-verify`。

### 初始化数据库

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # 可选：填充测试数据
```

### 启动服务

```bash
# 后端 (端口 3001)
cd backend
npm run dev

# 前端 (端口 5173)
cd frontend
npm run dev
```

访问 http://localhost:5173 查看应用。

## 👥 用户角色

| 角色 | 权限 |
|------|------|
| `user` | 普通用户，发布动态、评论、点赞 |
| `reviewer` | 审核员，审核举报内容 |
| `admin` | 管理员，用户管理、审批举报 |
| `super_admin` | 超级管理员，最高权限 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**Made with ❤️ by [Geoff-WSX](https://github.com/Geoff-WSX)**
