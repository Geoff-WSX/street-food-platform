# 测试环境使用指南

**说明**: 本指南用于在测试环境中运行测试，与开发环境隔离

---

## 🧪 测试环境说明

### 环境隔离

```
开发环境 vs 测试环境

开发环境:
├── 后端: 3000 端口
├── 前端: 5176 端口
└── 数据库: street_food_web

测试环境:
├── 后端: 3002 端口
├── 数据库: street_food_web_test
└── 状态: 独立运行
```

### 使用场景

**测试环境专用脚本**适用于：
- ✅ 验证代码质量
- ✅ 运行测试套件
- ✅ CI/CD 集成
- ✅ 回归测试

**开发环境**适用于：
- ✅ 功能开发
- ✅ 调试代码
- ✅ 查看UI效果
- ✅ 手动测试

---

## 🚀 快速开始

### 一键运行测试环境

```bash
cd backend
./scripts/test-env-only.sh
```

**脚本功能**:
1. ✅ 自动关闭开发服务器
2. ✅ 验证测试环境
3. ✅ 运行完整测试套件
4. ✅ 生成测试报告
5. ✅ 自动清理资源

### 手动运行测试环境

```bash
# 1. 关闭开发服务器
lsof -ti:3000 | xargs kill -9
lsof -ti:5176 | xargs kill -9

# 2. 清理测试端口
lsof -ti:3002 | xargs kill -9

# 3. 设置测试环境
export NODE_ENV=test
export DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test"
export PORT=3002

# 4. 运行测试
npm test
```

---

## 📊 测试结果

### 当前测试状态

```
测试套件: 认证模块
通过率: 19/20 (95%)
测试时间: ~10秒
状态: ✅ 良好
```

### 测试覆盖

| 模块 | 测试数量 | 通过率 | 状态 |
|------|---------|--------|------|
| 认证 | 20 | 95% | ✅ |
| 动态 | 33 | 待验证 | 🔄 |
| 评论 | 31 | 待验证 | 🔄 |
| 用户 | 56 | 待验证 | 🔄 |
| 搜索 | 43 | 待验证 | 🔄 |

---

## 🔧 环境配置

### 测试数据库

```bash
# 数据库名称
street_food_web_test

# 连接信息
Host: localhost
Port: 3306
User: root
Password: root123456
```

### 测试配置

```bash
NODE_ENV=test
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test"
PORT=3002
```

---

## 📋 测试命令

### 运行所有测试

```bash
npm test
```

### 运行特定测试

```bash
# 认证测试
npm test -- auth.test.ts

# 动态测试
npm test -- posts.test.ts

# 评论测试
npm test -- comments.test.ts
```

### 生成覆盖率报告

```bash
npm run test:coverage
```

---

## 🎯 测试流程

### 推荐测试流程

```
1. 开发功能
   ↓
2. 关闭开发服务器
   ↓
3. 运行测试环境
   ./scripts/test-env-only.sh
   ↓
4. 查看测试结果
   cat ./logs/test_results_*.log
   ↓
5. 修复问题（如有）
   ↓
6. 重新运行测试
   ↓
7. 继续开发
```

---

## 🔍 故障处理

### 端口冲突

```bash
# 检查端口占用
lsof -i :3002

# 清理端口
lsof -ti:3002 | xargs kill -9
```

### 数据库连接失败

```bash
# 检查数据库
mysql -u root -p -e "USE street_food_web_test;"

# 重新同步
npx prisma db push
```

### 测试超时

```bash
# 增加超时时间
npm test -- --testTimeout=10000
```

---

## 📈 测试最佳实践

### 运行测试的时机

1. **提交代码前** - 运行相关测试
2. **合并PR前** - 运行完整测试套件
3. **发布前** - 运行所有测试
4. **重构后** - 确保没有破坏功能

### 测试环境维护

- 定期清理测试数据
- 更新测试数据库Schema
- 检查测试覆盖率
- 优化测试性能

---

## ✅ 测试环境检查清单

### 运行测试前

- [ ] 开发服务器已关闭
- [ ] 测试端口已清理
- [ ] 测试数据库可用
- [ ] 环境变量已设置

### 测试完成后

- [ ] 查看测试结果
- [ ] 检查失败原因
- [ ] 修复失败问题
- [ ] 重新运行测试

---

## 📞 帮助与支持

### 查看测试日志

```bash
# 最新测试日志
ls -lt ./logs/test_results_*.log | head -1

# 查看日志内容
cat ./logs/test_results_YYYYMMDD_HHMMSS.log
```

### 重新同步测试数据库

```bash
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test" \
npx prisma db push
```

---

**使用建议**: 每次提交代码前运行测试环境，确保代码质量。

**文档维护**: 开发团队
**最后更新**: 2025年4月10日
