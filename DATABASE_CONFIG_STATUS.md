# 🗄️ 数据库配置说明

> 更新时间：2025年4月13日

---

## 📊 当前数据库配置

### 实际存在的数据库
| 数据库名称 | 用途 | 状态 |
|-----------|------|------|
| `street_food_db` | 小程序生产/开发共享 | ✅ 存在 |
| `street_food_dev_db` | 小程序开发环境 | ✅ 存在 |
| `street_food_test` | 小程序测试环境 | ✅ 存在 |
| `street_food_test_db` | 通用测试数据库 | ✅ 存在 |
| `street_food_web` | Web项目开发 | ✅ 存在 |
| `street_food_web_test` | Web项目测试 | ✅ 存在 |
| `street_food_web_prod` | **Web项目生产** | ❌ 不存在 |

---

## ⚠️ 配置问题

### 环境配置文件 vs 实际数据库

#### 生产环境配置 (.env.production)
```bash
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_prod"
```
**问题**: 数据库 `street_food_web_prod` 不存在

#### 测试环境配置 (.env.test)
```bash
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test"
```
**状态**: ✅ 数据库存在

#### 当前实际使用 (.env)
```bash
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_db"
```
**问题**: 与小程序共享数据库

---

## 🔧 建议的配置方案

### 方案 A：创建独立的生产数据库（推荐）
```bash
# 创建生产数据库
mysql -uroot -proot123456 -e "CREATE DATABASE street_food_web_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 同步 schema
cd backend
npx prisma db push --schema=./prisma/schema.prisma
```

### 方案 B：使用现有数据库
如果不想创建新数据库，可以修改配置：
- **生产环境**: 使用 `street_food_web` 
- **测试环境**: 使用 `street_food_web_test`

---

## 📋 数据分离状态

### 当前状态
- ✅ 测试环境独立 (`street_food_web_test`)
- ⚠️ 生产环境未独立配置
- ⚠️ 与小程序共享 `street_food_db`

### 理想状态
- ✅ 测试环境独立
- ✅ 生产环境独立  
- ✅ 与小程序数据分离

---

## 🚀 快速修复

### 1. 创建生产数据库
```bash
mysql -uroot -proot123456 -e "CREATE DATABASE street_food_web_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. 更新环境配置
```bash
# 确保使用正确的 .env 文件
cp backend/.env.production backend/.env
```

### 3. 同步数据库结构
```bash
cd backend
npx prisma db push
```

---

## 💡 建议

1. **生产环境应该有独立的数据库**
2. **测试和生产数据应该完全分离**
3. **避免与小程序共享生产数据库**

---

*配置问题需要修复以确保数据安全和隔离*
