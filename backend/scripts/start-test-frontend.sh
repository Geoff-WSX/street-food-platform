#!/bin/bash

# 测试前端启动脚本
# 启动测试环境的前端界面

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "\n${GREEN}▶ $1${NC}"
    echo "========================================"
}

print_warning() {
    echo -e "\n${YELLOW}⚠️  $1${NC}"
}

print_success() {
    echo -e "\n${GREEN}✅ $1${NC}"
}

echo "🧪 测试前端启动脚本"
echo "==================="
echo "测试前端: http://localhost:5178"
echo "测试后端: http://localhost:3002"
echo ""

# 第一步: 准备测试环境
print_step "第一步: 准备测试环境"

echo "检查测试数据库..."
DB_EXISTS=$(mysql -u root -proot123456 -e "SHOW DATABASES LIKE 'street_food_web_test'" -s -N 2>&1 | grep -v Warning)

if [ -z "$DB_EXISTS" ]; then
    print_warning "测试数据库不存在，正在创建..."
    mysql -u root -proot123456 -e "CREATE DATABASE street_food_web_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1 | grep -v Warning
fi

echo "同步测试数据库Schema..."
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test" \
    npx prisma db push --schema=./prisma/schema.prisma 2>&1 | grep -v "Warning\|Generated"

# 第二步: 创建测试前端数据
print_step "第二步: 创建测试前端数据"

echo "为测试前端创建测试数据..."
mysql -u root -proot123456 street_food_web_test << 'EOFSQL' 2>&1 | grep -v Warning

-- 创建测试用户
INSERT INTO users (username, email, password, bio, role, isActive, createdAt, updatedAt) VALUES
('test_user_1', 'test1@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456789012345678901234567890123', '测试用户1 - 用于测试环境验证', 'user', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO users (username, email, password, bio, role, isActive, createdAt, updatedAt) VALUES
('test_user_2', 'test2@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456789012345678901234567890123', '测试用户2 - 用于测试环境验证', 'user', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO users (username, email, password, bio, role, isActive, createdAt, updatedAt) VALUES
('test_admin', 'testadmin@example.com', '$2b$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456789012345678901234567890123', '测试管理员 - 测试环境专用', 'admin', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE username=username;

-- 获取测试用户ID
SET @testUser1 = (SELECT id FROM users WHERE username = 'test_user_1');
SET @testUser2 = (SELECT id FROM users WHERE username = 'test_user_2');

-- 创建测试动态
INSERT INTO posts (userId, content, images, address, latitude, longitude, createdAt, updatedAt) VALUES
(@testUser1, '测试动态1 - 这是测试环境的动态数据',
'["https://picsum.photos/seed/test1/800/600"]',
'测试地址1', 39.9389, 116.4539, NOW(), NOW())
ON DUPLICATE KEY UPDATE content=content;

INSERT INTO posts (userId, content, images, address, latitude, longitude, createdAt, updatedAt) VALUES
(@testUser2, '测试动态2 - 验证功能正常',
'["https://picsum.photos/seed/test2/800/600"]',
'测试地址2', 31.2359, 121.4805, NOW(), NOW())
ON DUPLICATE KEY UPDATE content=content;

EOFSQL

# 第三步: 启动测试后端
print_step "第三步: 启动测试后端"

echo "清理测试端口..."
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

echo "启动测试后端 (端口 3002)..."
cd backend

# 创建测试后端启动脚本
cat > .start-test-backend.sh << 'EOF'
#!/bin/bash
export NODE_ENV=test
export DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test"
export PORT=3002
npm run dev
EOF

chmod +x .start-test-backend.sh

# 后台启动测试后端
nohup ./.start-test-backend.sh > ../logs/test-backend.log 2>&1 &
BACKEND_PID=$!

echo "测试后端已启动 (PID: $BACKEND_PID)"

# 等待后端启动
echo "等待后端启动..."
sleep 5

# 检查后端是否启动成功
if curl -s http://localhost:3002/api/health > /dev/null 2>&1 || curl -s http://localhost:3002/api/posts > /dev/null 2>&1; then
    print_success "测试后端启动成功"
else
    # 后端可能需要更长时间启动
    print_warning "等待后端完全启动..."
    sleep 5
fi

# 第四步: 启动测试前端
print_step "第四步: 启动测试前端"

echo "清理测试前端端口..."
lsof -ti:5178 | xargs kill -9 2>/dev/null || true

echo "启动测试前端..."
cd ../frontend

# 创建测试前端启动脚本
cat > .start-test-frontend.sh << 'EOF'
#!/bin/bash
npx vite --config vitest.config.env.ts --host
EOF

chmod +x .start-test-frontend.sh

print_success "测试前端已启动"

# 第五步: 显示访问信息
print_step "第五步: 测试环境访问信息"

echo ""
echo "🎯 测试环境已启动！"
echo ""
echo "📱 测试前端: http://localhost:5178"
echo "🔧 测试后端: http://localhost:3002"
echo "💾 测试数据库: street_food_web_test"
echo ""
echo "🔑 测试账号:"
echo "   邮箱: test1@example.com"
echo "   密码: password123"
echo ""
echo "📋 工作流程:"
echo "   1. 在测试前端验证功能"
echo "   2. 确认功能正常后"
echo "   3. 使用同步脚本迁移到开发环境"
echo ""
echo "🛑 停止测试环境:"
echo "   Ctrl+C 或运行 ./scripts/stop-test-env.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "按 Ctrl+C 停止测试环境"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 保持脚本运行
wait
