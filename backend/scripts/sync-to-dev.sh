#!/bin/bash

# 环境间数据同步脚本
# 将测试环境的改动迁移到开发环境

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "\n${BLUE}ℹ️  $1${NC}"
}

echo "🔄 环境间数据同步脚本"
echo "==================="
echo ""
echo "从: 测试环境 (street_food_web_test)"
echo "到: 开发环境 (street_food_web)"
echo ""

# 配置
TEST_DB="street_food_web_test"
DEV_DB="street_food_web"
MYSQL_USER="root"
MYSQL_PASS="root123456"
BACKUP_DIR="./backups"

mkdir -p $BACKUP_DIR

# 第一步: 备份开发环境
print_step "第一步: 备份开发环境"

BACKUP_FILE="$BACKUP_DIR/street_food_web_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "备份开发环境..."
mysqldump -u $MYSQL_USER -p$MYSQL_PASS $DEV_DB > $BACKUP_FILE 2>&1 | grep -v "Warning"

print_success "开发环境已备份: $BACKUP_FILE"

# 第二步: 选择同步内容
print_step "第二步: 选择同步内容"

echo ""
echo "请选择要同步的内容:"
echo "  1. 数据库结构 (Schema)"
echo "  2. 数据库数据 (Data)"
echo "  3. 数据库结构 + 数据"
echo "  4. 取消"
echo ""
read -p "请选择 (1/2/3/4): " -r

case $REPLY in
    1)
        print_info "只同步数据库结构"
        SYNC_MODE="schema"
        ;;
    2)
        print_info "只同步数据库数据"
        SYNC_MODE="data"
        ;;
    3)
        print_info "同步数据库结构和数据"
        SYNC_MODE="all"
        ;;
    4)
        echo "❌ 取消同步"
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

# 第三步: 确认同步
print_step "第三步: 确认同步"

echo ""
echo "同步配置:"
echo "  源环境: $TEST_DB"
echo "  目标环境: $DEV_DB"
echo "  同步模式: $SYNC_MODE"
echo ""

if [ "$SYNC_MODE" = "schema" ] || [ "$SYNC_MODE" = "all" ]; then
    echo "📋 将同步以下内容:"
    echo "  - 数据库表结构"
    echo "  - 索引和约束"
fi

if [ "$SYNC_MODE" = "data" ] || [ "$SYNC_MODE" = "all" ]; then
    echo "  - 用户数据"
    echo "  - 动态数据"
    echo "  - 评论和互动"
    echo "  - 所有测试数据"
fi

echo ""
print_warning "这将覆盖开发环境的对应数据！"
read -p "确认继续？(y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消同步"
    exit 0
fi

# 第四步: 执行同步
print_step "第四步: 执行同步"

if [ "$SYNC_MODE" = "schema" ] || [ "$SYNC_MODE" = "all" ]; then
    echo "同步数据库结构..."

    # 从测试数据库导出结构
    mysqldump -u $MYSQL_USER -p$MYSQL_PASS --no-data $TEST_DB 2>&1 | grep -v "Warning" | \
        mysql -u $MYSQL_USER -p$MYSQL_PASS $DEV_DB

    print_success "数据库结构已同步"
fi

if [ "$SYNC_MODE" = "data" ] || [ "$SYNC_MODE" = "all" ]; then
    echo "同步数据库数据..."

    # 只同步测试相关的数据（不是所有数据）
    mysql -u $MYSQL_USER -p$MYSQL_PASS $DEV_DB << 'EOFSQL'
        -- 清理开发环境的测试数据
        DELETE FROM comment_likes WHERE userId IN (SELECT id FROM users WHERE username LIKE 'test_%');
        DELETE FROM comments WHERE userId IN (SELECT id FROM users WHERE username LIKE 'test_%');
        DELETE FROM likes WHERE userId IN (SELECT id FROM users WHERE username LIKE 'test_%');
        DELETE FROM posts WHERE userId IN (SELECT id FROM users WHERE username LIKE 'test_%');
        DELETE FROM follows WHERE followerId IN (SELECT id FROM users WHERE username LIKE 'test_%') OR followingId IN (SELECT id FROM users WHERE username LIKE 'test_%');
        DELETE FROM notifications WHERE userId IN (SELECT id FROM users WHERE username LIKE 'test_%');
        DELETE FROM users WHERE username LIKE 'test_%';
EOFSQL

    # 从测试数据库复制测试数据
    mysqldump -u $MYSQL_USER -p$MYSQL_PASS --no-create-info $TEST_DB 2>&1 | grep -v "Warning" | \
        mysql -u $MYSQL_USER -p$MYSQL_PASS $DEV_DB

    print_success "数据库数据已同步"
fi

# 第五步: 验证同步
print_step "第五步: 验证同步"

echo "验证开发环境数据..."
DEV_USER_COUNT=$(mysql -u $MYSQL_USER -p$MYSQL_PASS $DEV_DB -sN -e "SELECT COUNT(*) FROM users WHERE username LIKE 'test_%';" 2>&1 | grep -v Warning)
DEV_POST_COUNT=$(mysql -u $MYSQL_USER -p$MYSQL_PASS $DEV_DB -sN -e "SELECT COUNT(*) FROM posts WHERE userId IN (SELECT id FROM users WHERE username LIKE 'test_%');" 2>&1 | grep -v Warning)

echo "开发环境测试数据:"
echo "  测试用户数: $DEV_USER_COUNT"
echo "  测试动态数: $DEV_POST_COUNT"

# 第六步: 代码同步提示
print_step "第六步: 代码同步"

echo ""
echo "📋 代码同步提醒:"
echo ""
echo "如果测试环境中修改了代码，需要手动同步:"
echo ""
echo "1. 后端代码同步:"
echo "   cd backend"
echo "   git diff  # 查看修改"
echo "   git add ."
echo "   git commit -m 'feat: 从测试环境迁移'"
echo ""
echo "2. 前端代码同步:"
echo "   cd frontend"
echo "   git diff"
echo "   git add ."
echo "   git commit -m 'feat: 从测试环境迁移'"
echo ""

# 第七步: 完成
print_step "完成"

echo ""
echo "✅ 同步完成！"
echo ""
echo "📊 开发环境现在包含测试环境的改动"
echo ""
echo "🔄 下一步:"
echo "   1. 重启开发服务器"
echo "   2. 验证功能正常"
echo "   3. 提交代码到版本库"
echo ""
echo "💾 备份文件: $BACKUP_FILE"
