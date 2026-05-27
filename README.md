# 🍜 食遇 - 街头美食社交平台

> 发现身边的烟火气，分享身边的美食故事

**🌐 在线访问**: https://shiyutop.asia

## ✨ 平台简介

食遇是一个街头美食社交平台，帮助用户发现身边的美味小吃，分享美食体验，与志同道合的美食爱好者互动。

## 🎯 核心功能

### 🍽️ 美食探索
- 📍 基于地理位置的美食发现
- 🔥 精选美食动态推荐
- ⭐ 美食排行榜

### 👥 社交互动
- 📝 发布图文动态分享美食
- ❤️ 点赞、收藏、评论
- 👤 关注用户、获取粉丝
- 📨 私信聊天

### 🤖 AI 助手 (小边)
- 🍜 智能美食推荐
- 🗺️ 美食路线规划
- 💬 智能对话

### 👨‍💻 管理后台
- 📊 数据统计
- 👥 用户管理
- 📝 举报审核

## 🛠️ 技术栈

### 前端
| 技术 | 说明 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Ant Design | UI 组件库 |
| Zustand | 状态管理 |

### 后端
| 技术 | 说明 |
|------|------|
| Node.js | 运行环境 |
| Express | Web 框架 |
| TypeScript | 开发语言 |
| MySQL | 数据库 |
| Prisma | ORM |
| JWT | 认证 |

### AI
- OpenAI GPT-4o-mini

## 📁 项目结构

```
├── frontend/                 # 前端应用 (React 19)
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── components/     # React 组件
│   │   ├── pages/          # 页面
│   │   ├── store/          # Zustand 状态
│   │   └── styles/         # 样式文件
│   └── package.json
│
├── backend/                  # 后端应用 (Express)
│   ├── prisma/             # 数据库 Schema
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── services/       # 业务逻辑
│   │   ├── routes/         # 路由
│   │   ├── middleware/      # 中间件
│   │   └── utils/          # 工具函数
│   └── package.json
│
└── CLAUDE.md               # 项目文档
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- MySQL >= 8.0

### 安装部署

```bash
# 前端
cd frontend && npm install && npm run build

# 后端
cd backend && npm install && npx prisma generate && npm run build
```

### 环境变量

在 `backend/.env` 配置：

```env
DATABASE_URL="mysql://user:password@localhost:3306/street_food"
JWT_SECRET="your-secret-key"
OPENAI_API_KEY="your-openai-api-key"
PORT=3000
NODE_ENV=development
```

## 👥 用户角色

| 角色 | 说明 |
|------|------|
| `user` | 普通用户 |
| `reviewer` | 审核员 |
| `admin` | 管理员 |
| `super_admin` | 超级管理员 |

## 📄 许可证

MIT License

---

**© 2024 食遇 shiyutop.asia | Made with ❤️**
