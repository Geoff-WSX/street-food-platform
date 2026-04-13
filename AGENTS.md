# Agent 快速参考

## 🚀 使用方法

在 Claude Code 中直接输入：
```
使用 <Agent名> 代理 <任务描述>
```

---

## 📱 street-food-platform（Web 项目）

### 项目路径
```
/Users/Zhuanz/street-food-platform
```

### 前端开发 (frontend/src/)
| 任务 | 使用代理 |
|------|---------|
| React 组件开发 | `Frontend Developer` |
| 界面设计 | `UI Designer` |
| 用户体验优化 | `UX Researcher` |
| 代码审查 | `Code Reviewer` |
| 性能优化 | `Performance Benchmarker` |

### 后端开发 (backend/src/)
| 任务 | 使用代理 |
|------|---------|
| API 设计 | `Backend Architect` |
| 数据库优化 | `Database Optimizer` |
| 安全审查 | `Security Engineer` |
| AI 功能 | `AI Engineer` |
| WebSocket | `Backend Architect` |

---

## 📱 street-food-platform-miniprogram（小程序项目）

### 项目路径
```
/Users/Zhuanz/street-food-platform-miniprogram
```

### 小程序前端 (src/)
| 任务 | 使用代理 |
|------|---------|
| 小程序专属功能 | `WeChat Mini Program Developer` |
| Taro/React 组件 | `Frontend Developer` |
| 界面设计 | `UI Designer` |
| 代码审查 | `Code Reviewer` |
| 性能优化 | `Performance Benchmarker` |

### 小程序后端 (backend/src/)
| 任务 | 使用代理 |
|------|---------|
| API 设计 | `Backend Architect` |
| 数据库优化 | `Database Optimizer` |
| 安全审查 | `Security Engineer` |
| AI 功能 | `AI Engineer` |

---

## ⚠️ 数据库改动（两个项目都改）

当改动涉及数据库表结构时：
| 任务 | 使用代理 |
|------|---------|
| 数据库设计 | `Database Optimizer` |
| Prisma Schema | `Backend Architect` |

需同步修改两个项目的 `prisma/schema.prisma`

---

## 💡 调用示例

```
# Web 项目
使用 Frontend Developer 代理开发美食卡片组件
使用 Backend Architect 代理设计评论 API

# 小程序项目
使用 WeChat Mini Program Developer 代理开发评论功能
使用 Frontend Developer 代理优化列表加载

# 两个项目都要改
使用 Database Optimizer 代理优化数据库查询
```
