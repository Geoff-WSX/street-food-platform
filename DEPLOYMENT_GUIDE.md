# 数据分离与测试环境部署指南

**项目**: 街头美食社交平台 Web 版
**日期**: 2025年4月10日
**目标**: 实现Web项目与小程序项目的数据分离，建立完整的测试→生产部署流程

---

## 📊 数据库架构

### 新架构设计

```
原来（共享）:
┌─────────────────────────┐
│   street_food_db        │
│   (Web + 小程序共享)    │
└─────────────────────────┘

现在（分离）:
┌─────────────────────────┐   ┌─────────────────────────┐
│   street_food_db        │   │   street_food_web_prod  │
│   (小程序项目专用)       │   │   (Web项目生产环境)     │
└─────────────────────────┘   └─────────────────────────┘

┌─────────────────────────┐   ┌─────────────────────────┐
│   street_food_test      │   │   street_food_web_test  │
│   (小程序测试)          │   │   (Web项目测试环境)     │
└─────────────────────────┘   └─────────────────────────┘
```

### 数据库分配

| 数据库名称 | 用途 | 项目 |
|-----------|------|------|
| `street_food_db` | 小程序生产环境 | 小程序项目 |
| `street_food_test` | 小程序测试环境 | 小程序项目 |
| `street_food_web_prod` | **Web生产环境** | Web项目 ✨ |
| `street_food_web_test` | **Web测试环境** | Web项目 ✨ |

---

## 🔧 环境配置

### 环境变量配置文件

```bash
backend/
├── .env                  # 开发环境（使用独立数据库）
├── .env.test            # 测试环境
├── .env.production      # 生产环境
└── .env.web            # Web项目独立配置（备用）
```

### 配置文件内容

#### .env (开发环境)
```bash
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web"
PORT=3000
NODE_ENV="development"
```

#### .env.test (测试环境)
```bash
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test"
PORT=3002
NODE_ENV="test"
```

#### .env.production (生产环境)
```bash
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_prod"
PORT=3000
NODE_ENV="production"
```

---

## 🚀 部署流程

### 完整的测试→生产流程

```
┌─────────────────────────────────────────────────────────┐
│                    部署流程                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 开发环境测试                                         │
│     ↓                                                  │
│  2. 运行测试套件                                        │
│     ↓                                                  │
│  3. 测试环境验证                                        │
│     ↓                                                  │
│  4. 备份生产环境                                        │
│     ↓                                                  │
│  5. 更新生产环境                                        │
│     ↓                                                  │
│  6. 生产环境验证                                        │
│     ↓                                                  │
│  7. 完成                                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 步骤详解

#### 步骤1: 开发环境测试
```bash
# 1. 切换到开发环境
cp .env.example .env

# 2. 安装依赖
npm install

# 3. 同步数据库Schema
npx prisma generate
npx prisma db push

# 4. 启动开发服务器
npm run dev
```

#### 步骤2: 运行测试套件
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- auth.test.ts

# 生成覆盖率报告
npm run test:coverage
```

#### 步骤3: 测试环境验证
```bash
# 1. 清理测试端口
lsof -ti:3002 | xargs kill -9

# 2. 运行测试环境
NODE_ENV=test npm test

# 3. 验证测试结果
# 所有测试应该通过
```

#### 步骤4-7: 生产环境部署
```bash
# 使用自动化部署脚本
./scripts/deploy-to-production.sh
```

---

## 🛠️ 部署脚本

### 1. 数据库迁移脚本

**文件**: `scripts/migrate-to-web-db.sh`

**功能**:
- 从共享数据库迁移到独立数据库
- 支持结构迁移和数据迁移
- 自动备份原数据库

**使用方法**:
```bash
cd backend
./scripts/migrate-to-web-db.sh
```

**选项**:
1. 只迁移结构（Schema）
2. 迁移结构 + 测试数据
3. 迁移结构 + 全部数据

### 2. Schema同步脚本

**文件**: `scripts/sync-schema.sh`

**功能**:
- 在测试环境验证Schema
- 运行测试验证
- 同步到生产环境

**使用方法**:
```bash
cd backend
./scripts/sync-schema.sh
```

### 3. 生产环境部署脚本

**文件**: `scripts/deploy-to-production.sh`

**功能**:
- 完整的生产环境更新流程
- 自动备份生产环境
- 测试环境验证
- 生产环境更新
- 应用重启提示

**使用方法**:
```bash
cd backend
./scripts/deploy-to-production.sh
```

### 4. 回滚脚本

**文件**: `scripts/rollback.sh`

**功能**:
- 生产环境更新失败时回滚
- 从备份恢复数据
- 创建回滚前备份

**使用方法**:
```bash
cd backend
./scripts/rollback.sh <backup_file.sql>
```

---

## 📋 部署前检查清单

### 测试环境
- [ ] 测试数据库已创建并同步Schema
- [ ] 所有测试用例通过
- [ ] 测试覆盖率达标（>80%）
- [ ] 性能测试通过
- [ ] 安全测试通过

### 生产环境
- [ ] 生产环境已备份
- [ ] 回滚方案已准备
- [ ] 监控系统已配置
- [ ] 告警机制已启用
- [ ] 维护窗口已确认

### 应用服务
- [ ] 环境变量已配置
- [ ] 依赖包已安装
- [ ] 数据库连接已测试
- [ ] 日志系统已配置
- [ ] 错误追踪已启用

---

## 🔄 回滚流程

### 自动回滚条件

1. 测试失败时自动停止
2. 生产环境验证失败时提示回滚
3. 任何步骤失败都有回滚选项

### 手动回滚

```bash
# 1. 停止应用服务
pm2 stop street-food-web

# 2. 回滚数据库
./scripts/rollback.sh ./backups/street_food_web_prod_backup_YYYYMMDD_HHMMSS.sql

# 3. 恢复应用代码（如需要）
git checkout <previous-commit>

# 4. 重启应用服务
pm2 start street-food-web

# 5. 验证应用功能
```

---

## 📊 监控与验证

### 部署后监控

1. **应用日志**
   ```bash
   pm2 logs street-food-web
   ```

2. **错误日志**
   ```bash
   tail -f ./logs/error.log
   ```

3. **数据库性能**
   ```bash
   mysql -u root -p -e "SHOW PROCESSLIST;"
   ```

4. **API响应时间**
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health
   ```

### 功能验证

- [ ] 用户注册/登录
- [ ] 动态发布/查看
- [ ] 评论功能
- [ ] 搜索功能
- [ ] 实时通知
- [ ] WebSocket连接

---

## 🚨 故障处理

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查数据库状态
systemctl status mysql

# 检查连接配置
echo $DATABASE_URL

# 测试连接
mysql -u root -p -h localhost street_food_web_prod
```

#### 2. 测试失败
```bash
# 查看详细错误
npm test -- --verbose

# 清理测试数据
mysql -u root -p -e "USE street_food_web_test; DROP DATABASE street_food_web_test; CREATE DATABASE street_food_web_test;"
```

#### 3. 应用启动失败
```bash
# 检查端口占用
lsof -i :3000

# 检查日志
pm2 logs street-food-web --lines 100

# 重启应用
pm2 restart street-food-web
```

---

## 📈 最佳实践

### 开发流程

1. **功能开发** → 在开发环境（street_food_web）
2. **单元测试** → 测试环境（street_food_web_test）
3. **集成测试** → 测试环境
4. **测试通过** → 代码审查
5. **合并到主分支** → 准备部署
6. **生产部署** → 生产环境（street_food_web_prod）

### 数据安全

1. **定期备份** → 每日自动备份
2. **备份验证** → 定期测试备份恢复
3. **加密存储** → 敏感数据加密
4. **访问控制** → 最小权限原则

### 监控告警

1. **应用监控** → PM2 + 监控工具
2. **错误追踪** → Sentry / 日志聚合
3. **性能监控** → APM 工具
4. **告警通知** → 邮件/短信/钉钉

---

## 📞 联系与支持

**技术支持**: 开发团队
**紧急联系**: 运维团队
**文档维护**: 技术负责人

---

**文档版本**: 1.0
**最后更新**: 2025年4月10日
**维护者**: 技术团队
