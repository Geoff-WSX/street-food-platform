#!/bin/bash

# 测试环境专用脚本
# 关闭开发服务器，只运行测试环境

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

# 配置
TEST_PORT=3002
DEV_PORT=3000
FRONTEND_PORT=5176

echo "🧪 测试环境运行脚本"
echo "==================="
echo "测试端口: $TEST_PORT"
echo ""

# 第一步: 关闭所有开发服务器
print_step "第一步: 关闭开发服务器"

echo "检查运行中的服务..."
DEVS_RUNNING=false

if lsof -i :$DEV_PORT > /dev/null 2>&1; then
    echo "关闭后端开发服务器 (端口 $DEV_PORT)..."
    lsof -ti:$DEV_PORT | xargs kill -9 2>/dev/null
    DEVS_RUNNING=true
fi

if lsof -i :$FRONTEND_PORT > /dev/null 2>&1; then
    echo "关闭前端开发服务器 (端口 $FRONTEND_PORT)..."
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
    DEVS_RUNNING=true
fi

if lsof -i :$TEST_PORT > /dev/null 2>&1; then
    echo "清理测试端口 (端口 $TEST_PORT)..."
    lsof -ti:$TEST_PORT | xargs kill -9 2>/dev/null
fi

if $DEVS_RUNNING; then
    print_success "开发服务器已关闭"
else
    echo "✓ 没有运行中的开发服务器"
fi

# 第二步: 验证测试环境
print_step "第二步: 验证测试环境"

echo "检查测试数据库..."
DB_EXISTS=$(mysql -u root -proot123456 -e "SHOW DATABASES LIKE 'street_food_web_test'" -s -N 2>&1 | grep -v Warning)

if [ -z "$DB_EXISTS" ]; then
    print_warning "测试数据库不存在，正在创建..."
    mysql -u root -proot123456 -e "CREATE DATABASE street_food_web_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1 | grep -v Warning
    print_success "测试数据库已创建"
else
    echo "✓ 测试数据库存在"
fi

echo "同步测试数据库Schema..."
DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test" \
    npx prisma db push --schema=./prisma/schema.prisma 2>&1 | grep -v "Warning\|Generated"
print_success "测试环境已准备"

# 第三步: 运行测试
print_step "第三步: 运行测试套件"

echo "设置测试环境变量..."
export NODE_ENV=test
export DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test"
export PORT=3002

echo ""
echo "运行测试..."
echo "-----------"

# 创建日志目录
mkdir -p ./logs

# 运行测试并保存结果
LOG_FILE="./logs/test_results_$(date +%Y%m%d_%H%M%S).log"

if npm test 2>&1 | tee $LOG_FILE; then
    echo ""
    print_step "测试结果"
    print_success "测试通过"

    # 显示测试统计
    echo ""
    echo "📊 测试统计:"
    grep -E "Test Suites|Tests|Time|Snapshot" $LOG_FILE | tail -5

    echo ""
    print_success "测试环境运行完成"
    echo ""
    echo "📋 测试日志: $LOG_FILE"

    # 显示环境状态
    echo ""
    echo "🔍 环境状态:"
    echo "  开发服务器: 已关闭"
    echo "  测试环境: 运行完成"
    echo "  测试端口: $TEST_PORT (已清理)"

else
    echo ""
    print_step "测试结果"
    echo "❌ 测试失败"

    # 显示失败摘要
    echo ""
    echo "❌ 失败详情:"
    grep -E "FAIL|●" $LOG_FILE | head -10

    echo ""
    echo "📋 完整日志: $LOG_FILE"
    echo "运行以下命令查看详情:"
    echo "  cat $LOG_FILE"
fi

# 清理测试服务器
echo ""
lsof -ti:$TEST_PORT | xargs kill -9 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "测试环境运行完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
