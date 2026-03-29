# 贡献指南

感谢你有兴趣为街边美食平台做出贡献！

## 🚀 快速开始

### 1. Fork 仓库

点击右上角的 Fork 按钮，将项目 Fork 到你的 GitHub 账号。

### 2. 克隆到本地

```bash
git clone https://github.com/YOUR_USERNAME/street-food-platform.git
cd street-food-platform
```

### 3. 创建功能分支

```bash
git checkout develop
git checkout -b feature/your-feature-name
```

### 4. 进行开发

- 遵循项目的代码规范
- 添加必要的测试
- 更新相关文档

### 5. 提交更改

```bash
git add .
git commit -m "feat: 添加你的功能描述"
```

### 6. 推送到你的 Fork

```bash
git push origin feature/your-feature-name
```

### 7. 创建 Pull Request

访问原项目，点击 "New Pull Request" 按钮。

## 📋 开发规范

### Commit 消息规范

使用约定式提交格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

**示例：**
```bash
feat(ai): 添加智能对话功能
fix(auth): 修复登录 token 过期问题
docs(readme): 更新安装说明
```

### 代码规范

#### 前端 (React + TypeScript)

```typescript
// ✅ 好的实践
interface UserProps {
  name: string;
  age: number;
}

export default function UserCard({ name, age }: UserProps) {
  return <div>{name} - {age}</div>;
}

// ❌ 避免
export default function UserCard(props: any) {
  return <div>{props.name}</div>;
}
```

#### 后端 (Node.js + Express)

```typescript
// ✅ 好的实践
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ❌ 避免
export const getUserById = (req: any, res: any) => {
  const user = db.query('SELECT * FROM users WHERE id = ' + req.params.id);
  res.send(user);
};
```

### 命名规范

- **文件名**: 使用 kebab-case (`user-profile.tsx`)
- **组件名**: 使用 PascalCase (`UserProfile.tsx`)
- **变量/函数**: 使用 camelCase (`getUserData`)
- **常量**: 使用 UPPER_SNAKE_CASE (`API_BASE_URL`)
- **类型/接口**: 使用 PascalCase (`UserData`)

### 注释规范

```typescript
/**
 * 获取用户信息
 * @param userId - 用户 ID
 * @returns 用户对象
 * @throws {Error} 当用户不存在时
 */
export async function getUser(userId: number): Promise<User> {
  // 实现...
}
```

## 🧪 测试指南

### 运行测试

```bash
# 前端测试
cd frontend
npm test

# 后端测试
cd backend
npm test
```

### 测试覆盖率

```bash
# 生成覆盖率报告
npm run test:coverage
```

## 📝 文档

### 更新文档

当你添加新功能时，请更新：
- README.md - 如果是用户可见的功能
- API.md - 如果添加了新的 API 端点
- CONTRIBUTING.md - 如果改变了贡献流程

## 🐛 报告 Bug

报告 Bug 时，请提供：
1. 清晰的标题和描述
2. 复现步骤
3. 期望行为
4. 环境信息
5. 截图（如果适用）

## ✨ 提交功能建议

功能建议时，请说明：
1. 功能描述和使用场景
2. 建议的实现方案
3. 可能的替代方案
4. 优先级

## 📧 联系方式

- GitHub Issues: https://github.com/Geoff-WSX/street-food-platform/issues
- Discussions: https://github.com/Geoff-WSX/street-food-platform/discussions

## 📜 许可证

提交代码即表示你同意你的贡献将在 MIT 许可证下发布。

---

再次感谢你的贡献！🎉
