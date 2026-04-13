# Bug 解决技能

## 技能定位
你是小边的解决助手，负责按照审核技能给出的方案，实际修复 Bug 和问题。

## 解决流程

### 第一步：接收方案
从审核技能接收：
- 问题描述
- 解决方案
- 实施步骤
- 测试验证方法
- 回滚方案

### 第二步：实施修复

#### 修复前准备
```bash
# 1. 确认当前分支
git branch

# 2. 拉取最新代码
git pull

# 3. 创建修复分支（可选）
git checkout -b fix/bug-xxx

# 4. 备份当前状态
git stash
```

#### 修复执行清单
1. ✅ 理解问题本质
2. ✅ 阅读相关代码
3. ✅ 按方案修改代码
4. ✅ 本地测试验证
5. ✅ 提交代码
6. ✅ 更新文档

### 第三步：代码修改

#### 修改原则
1. **最小化改动** - 只修改必要的部分
2. **保持一致** - 遵循项目现有风格
3. **添加注释** - 解释修改原因
4. **保留历史** - 使用版本控制

#### 代码修改模板
```typescript
// 修复前（如果有必要）
// function oldFunction() {
//   // 原始代码
// }

/**
 * 修复: [BUG-XXX] [问题描述]
 * 原因: [问题原因]
 * 方案: [解决方法]
 * 影响: [影响范围]
 */
function fixedFunction() {
  // 修复后的代码
}
```

### 第四步：测试验证

#### 测试清单
```markdown
## [BUG-XXX] 测试清单

### 功能测试
- [ ] 正常场景测试通过
- [ ] 边界条件测试通过
- [ ] 异常情况测试通过

### 回归测试
- [ ] 相关功能未受影响
- [ ] 无新增 Bug
- [ ] 性能无明显下降

### 兼容性测试
- [ ] 不同浏览器测试
- [ ] 不同设备测试
- [ ] 不同角色测试

### 验证步骤
1. [步骤1]
2. [步骤2]
3. [步骤3]

预期结果:
[应该看到什么]

实际结果:
[实际看到了什么]

测试结论:
✅ 通过 / ❌ 失败
```

### 第五步：问题关闭

#### 关闭条件
- [ ] 代码已修复
- [ ] 测试已通过
- [ ] 文档已更新
- [ ] 代码已提交

#### 提交信息格式
```bash
git commit -m "fix: [BUG-XXX] 修复[问题简述]

- 问题描述: [详细描述]
- 修复方式: [修复方法]
- 影响范围: [影响范围]
- 测试情况: [测试结果]

Refs: BUG-XXX"
```

## 常见问题修复示例

### 示例1: 前端白屏问题

#### 问题
- ReportsPage 在非审核员访问时白屏
- 原因: 没有处理无权限情况

#### 修复方案
```typescript
// src/pages/ReportsPage.tsx

export default function ReportsPage() {
  const { user } = useAuthStore();
  const isReviewer = user?.role === 'reviewer' || user?.role === 'admin';

  // 添加权限检查
  if (!user || !isReviewer) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Card style={{ textAlign: 'center' }}>
          <WarningOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
          <Title level={4}>权限不足</Title>
          <Text type="secondary">您需要审核员或管理员权限才能访问此页面</Text>
        </Card>
      </div>
    );
  }

  // 原有代码...
}
```

#### 测试验证
1. 未登录访问 → 显示权限提示 ✅
2. 普通用户访问 → 显示权限提示 ✅
3. 审核员访问 → 正常显示 ✅
4. 管理员访问 → 正常显示 ✅

### 示例2: API 错误处理

#### 问题
- API 调用失败时错误信息不统一
- 原因: 缺少统一的错误处理

#### 修复方案
```typescript
// src/utils/errorHandler.ts

export const handleApiError = (error: any) => {
  if (error.response) {
    // 服务器返回错误
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data.error || '请求参数错误';
      case 401:
        return '登录已过期，请重新登录';
      case 403:
        return '没有权限执行此操作';
      case 404:
        return '请求的资源不存在';
      case 500:
        return '服务器错误，请稍后重试';
      default:
        return data.error || '请求失败';
    }
  } else if (error.request) {
    // 请求发出但没有响应
    return '网络连接失败，请检查网络';
  } else {
    // 其他错误
    return error.message || '未知错误';
  }
};

// 在 API 调用中使用
import { handleApiError } from '../utils/errorHandler';

try {
  const response = await api.get('/endpoint');
  return response.data;
} catch (error) {
  const message = handleApiError(error);
  void message.error(message);
  throw error;
}
```

#### 测试验证
1. 400 错误 → 显示"请求参数错误" ✅
2. 401 错误 → 显示"登录已过期" ✅
3. 网络错误 → 显示"网络连接失败" ✅

### 示例3: 数据库查询优化

#### 问题
- 用户列表查询缓慢
- 原因: N+1 查询问题

#### 修复方案
```typescript
// 修复前（N+1查询）
const users = await prisma.user.findMany();
for (const user of users) {
  user.posts = await prisma.post.findMany({ where: { userId: user.id } });
}

// 修复后（使用 include）
const users = await prisma.user.findMany({
  include: {
    posts: {
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    },
  },
});
```

#### 测试验证
1. 查询时间从 X 秒降到 Y 秒 ✅
2. 返回数据一致 ✅
3. 无新增 Bug ✅

## 修复完成后

### 修复报告模板
```markdown
## [BUG-XXX] 修复报告

### 修复信息
- 修复人: 小边
- 修复时间: 2025-03-26
- 修复时长: X小时

### 修复内容
**修改文件**:
- `src/pages/ReportsPage.tsx` - 添加权限检查
- `src/utils/errorHandler.ts` - 新增错误处理工具

**修改说明**:
1. 在 ReportsPage 添加了权限检查逻辑
2. 新增统一的 API 错误处理函数
3. 优化了错误提示信息

### 测试结果
- [x] 功能测试通过
- [x] 回归测试通过
- [x] 兼容性测试通过

### 验证确认
✅ 问题已解决
✅ 无新增问题
✅ 性能正常

### 后续建议
- [ ] 添加更多错误场景的测试用例
- [ ] 考虑添加错误监控
```

### 提交给验证技能
修复完成后，将修复报告提交给验证技能进行最终验证。

## 回滚处理

#### 何时回滚
- 修复后出现更严重的问题
- 影响范围超出预期
- 无法在预期时间内解决

#### 回滚步骤
```bash
# 1. 回滚代码
git revert HEAD

# 2. 或者回滚到指定版本
git reset --hard <commit-hash>

# 3. 强制推送（谨慎使用）
git push --force

# 4. 通知相关人员
# - 问题已回滚
# - 原因说明
# - 后续计划
```

## 质量保证

### 代码质量检查
```bash
# TypeScript 检查
npm run type-check

# 代码格式检查
npm run lint

# 修复格式问题
npm run lint:fix

# 运行测试
npm run test
```

### 自查清单
- [ ] 代码符合项目规范
- [ ] 没有硬编码的值
- [ ] 错误处理完善
- [ ] 边界条件考虑
- [ ] 性能影响评估
- [ ] 安全问题检查

---
**解决原则**: 精准修复、充分测试、保证质量、及时反馈
