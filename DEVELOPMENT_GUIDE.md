# 街头美食社交平台 - 开发指南

**项目状态**: 🚧 开发中
**最后更新**: 2025年4月10日

---

## 🚧 开发环境设置

### 环境要求

```bash
# 基础环境
Node.js >= 18.x
MySQL >= 8.0
npm >= 9.x

# 开发工具
Git
VS Code / WebStorm
Postman / Insomnia
```

### 项目结构

```
street-food-platform/
├── backend/              # 后端服务
│   ├── prisma/          # 数据库模型
│   ├── src/             # 源代码
│   ├── scripts/         # 脚本工具
│   └── tests/           # 测试文件
├── frontend/            # 前端应用
│   ├── src/             # 源代码
│   ├── public/          # 静态资源
│   └── tests/           # 测试文件
└── docs/                # 项目文档
```

### 环境配置

#### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

#### 2. 配置数据库

```bash
# 创建开发数据库
mysql -u root -p -e "CREATE DATABASE street_food_web CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 同步数据库结构
cd backend
npx prisma generate
npx prisma db push
```

#### 3. 环境变量

```bash
# 后端配置
cp backend/.env.example backend/.env

# 前端配置（如需要）
cp frontend/.env.example frontend/.env
```

---

## 🛠️ 开发工作流程

### 日常开发流程

#### 1. 启动开发服务器

```bash
# 终端1: 启动后端 (端口 3000)
cd backend
npm run dev

# 终端2: 启动前端 (端口 5176)
cd frontend
npm run dev
```

#### 2. 开发新功能

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 开发功能
# - 修改代码
# - 添加测试

# 3. 测试验证
npm test

# 4. 提交代码
git add .
git commit -m "feat: 添加功能描述"

# 5. 推送分支
git push origin feature/your-feature-name
```

#### 3. 运行测试

```bash
# 后端测试
cd backend
npm test

# 前端测试
cd frontend
npm test

# 测试覆盖率
npm run test:coverage
```

---

## 📝 开发规范

### 代码规范

#### 命名规范

```typescript
// 文件名: kebab-case
user.service.ts
post-card.tsx

// 类名: PascalCase
class UserService {}

// 变量/函数: camelCase
const userName = 'test';
function getUserData() {}

// 常量: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// 接口/类型: PascalCase
interface UserData {}
type PostStatus = 'draft' | 'published';
```

#### 注释规范

```typescript
/**
 * 函数功能描述
 * @param userId - 用户ID
 * @returns 用户数据
 */
async function getUser(userId: number): Promise<User> {
  // 实现
}
```

### Git 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关

#### 示例

```
feat(auth): 添加JWT认证功能

- 实现用户登录
- 添加token验证中间件
- 完善错误处理

Closes #123
```

---

## 🧪 测试策略

### 单元测试

```typescript
// 测试文件命名: *.test.ts
describe('UserService', () => {
  test('should create user', async () => {
    const user = await createUser({
      username: 'test',
      email: 'test@example.com',
    });
    expect(user).toHaveProperty('id');
  });
});
```

### 集成测试

```typescript
describe('Auth API', () => {
  test('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test',
        email: 'test@example.com',
        password: 'Test123456',
      });
    expect(response.status).toBe(201);
  });
});
```

---

## 🔧 常用开发命令

### 后端命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 测试
npm test                 # 运行所有测试
npm run test:watch       # 监视模式
npm run test:coverage    # 覆盖率报告

# 数据库
npx prisma generate      # 生成Prisma Client
npx prisma db push       # 同步数据库结构
npx prisma studio        # 打开Prisma Studio

# 脚本
./scripts/run-tests.sh   # 运行测试套件
```

### 前端命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览构建结果

# 测试
npm test                 # 运行测试
npm run test:ui          # UI测试界面
npm run test:coverage    # 覆盖率报告
```

---

## 🐛 调试指南

### 后端调试

```typescript
// 使用 VS Code 调试
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev"],
  "console": "integratedTerminal"
}

// 日志调试
console.log('Debug info:', data);
console.error('Error:', error);
```

### 前端调试

```typescript
// React DevTools
// 浏览器开发者工具
// VS Code 调试器

// 日志调试
console.log('State:', state);
console.trace('Function call');
```

### 数据库调试

```bash
# Prisma Studio
npx prisma studio

# 直接查询
mysql -u root -p street_food_web
```

---

## 📊 开发进度追踪

### 当前状态

- ✅ 用户认证系统
- ✅ 动态发布功能
- ✅ 评论互动系统
- ✅ 实时消息功能
- ✅ 实时通知系统
- ✅ AI 智能推荐
- ✅ 搜索功能
- ✅ 管理后台

### 待完成功能

- [ ] 图片上传优化
- [ ] 性能优化
- [ ] 安全加固
- [ ] 监控告警
- [ ] 部署准备

---

## 🚀 准备发布前的检查清单

### 代码质量
- [ ] 所有测试通过
- [ ] 测试覆盖率 > 80%
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告

### 功能验证
- [ ] 核心功能正常
- [ ] 边界情况处理
- [ ] 错误处理完善
- [ ] 性能达标

### 安全检查
- [ ] SQL注入防护
- [ ] XSS攻击防护
- [ ] CSRF防护
- [ ] 数据加密

### 文档完善
- [ ] API文档
- [ ] 部署文档
- [ ] 运维文档
- [ ] 用户手册

---

## 📞 团队协作

### 分支策略

```
main (生产)
  └── develop (开发)
      └── feature/* (功能分支)
      └── bugfix/* (修复分支)
```

### 代码审查

1. 提交 Pull Request
2. 自动化测试运行
3. 代码审查
4. 合并到 develop

### 发布流程

1. develop → main
2. 运行完整测试
3. 部署到预发布环境
4. 最终验证
5. 生产环境发布

---

## 📚 相关文档

- **DEPLOYMENT_GUIDE.md** - 部署指南（发布时使用）
- **DATA_SEPARATION_REPORT.md** - 数据分离报告
- **TEST_OPTIMIZATION_REPORT.md** - 测试优化报告
- **CLAUDE.md** - 项目配置指南

---

**文档维护**: 开发团队
**最后更新**: 2025年4月10日
**下次更新**: 功能完成时
