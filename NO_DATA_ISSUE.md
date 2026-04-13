# 前端无数据问题 - 解决方案

## 问题原因

前端 `http://localhost:5176/` 没有数据是因为：

1. **数据库分离**: Web项目现在使用独立的 `street_food_web` 数据库
2. **空数据库**: 新数据库是空的，没有迁移数据
3. **测试数据**: 需要创建测试数据用于开发

## ✅ 已完成

### 测试数据已创建

当前 `street_food_web` 数据库包含：

**用户数据** (4个用户):
- `foodie_master` (foodie@example.com) - 美食达人
- `noodle_lover` (noodle@example.com) - 面条爱好者  
- `dimsum_fan` (dimsum@example.com) - 点心专家
- `admin` (admin@example.com) - 管理员

**动态数据** (3条动态):
- 拉面馆推荐
- 虾饺皇推荐
- 深夜烧烤推荐

**互动数据**:
- 评论: 3条
- 点赞: 已添加

## 🎯 测试账号

```
邮箱: foodie@example.com
密码: 任意密码（测试环境）
```

或使用注册功能创建新用户。

## 🔧 确保数据正常

### 1. 检查后端服务

```bash
# 确保后端在运行
cd backend
npm run dev
```

后端应该在 `http://localhost:3000` 运行

### 2. 检查前端服务

```bash
# 确保前端在运行
cd frontend
npm run dev
```

前端应该在 `http://localhost:5176` 运行

### 3. 验证数据库连接

```bash
# 检查数据库
mysql -u root -p -e "USE street_food_web; SELECT COUNT(*) FROM posts;"
```

## 📊 数据统计

```
用户数: 4
动态数: 3  
评论数: 3
点赞数: 已添加
```

## 💡 访问前端

现在访问 `http://localhost:5176` 应该能看到：
- ✅ 3条美食动态
- ✅ 用户信息
- ✅ 评论和点赞功能

## 🔍 如果仍然没有数据

1. **检查后端API**:
   ```bash
   curl http://localhost:3000/api/posts
   ```

2. **检查浏览器控制台**:
   - 打开开发者工具 (F12)
   - 查看Console标签的错误信息
   - 查看Network标签的API请求

3. **检查环境变量**:
   ```bash
   # 后端
   echo $DATABASE_URL
   # 应该指向 street_food_web
   ```

4. **重启服务**:
   ```bash
   # 重启后端
   cd backend
   npm run dev
   
   # 重启前端
   cd frontend
   npm run dev
   ```

## 📝 添加更多测试数据

如果需要更多测试数据，运行：

```bash
cd backend
./scripts/seed-test-data.sh
```

---

**现在前端应该有数据了！** 如果还有问题，请检查浏览器控制台的错误信息。
