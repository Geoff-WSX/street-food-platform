#!/bin/bash

# 回滚脚本
# 用于生产环境更新失败时恢复

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 检查参数
if [ -z "$1" ]; then
    print_error "请提供备份文件路径"
    echo "用法: ./rollback.sh <backup_file.sql>"
    exit 1
fi

BACKUP_FILE="$1"
PROD_DB="street_food_web_prod"
MYSQL_USER="root"
MYSQL_PASS="root123456"

echo "🔄 生产环境回滚流程"
echo "===================="
echo ""
echo "备份文件: $BACKUP_FILE"
echo "目标数据库: $PROD_DB"
echo ""

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "备份文件不存在"
    exit 1
fi

print_success "备份文件存在"

# 确认回滚
print_warning "警告: 这将覆盖生产环境当前数据！"
echo "此操作不可逆"
echo ""
read -p "确认回滚？(y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消回滚"
    exit 0
fi

# 创建当前状态备份
print_warning "创建当前状态备份..."
CURRENT_BACKUP="./backups/${PROD_DB}_before_rollback_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p ./backups

if mysqldump -u $MYSQL_USER -p$MYSQL_PASS $PROD_DB > $CURRENT_BACKUP; then
    print_success "当前状态已备份: $CURRENT_BACKUP"
else
    print_error "备份当前状态失败"
    read -p "是否继续回滚？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 停止应用服务
print_warning "请先停止应用服务"
echo "执行: pm2 stop street-food-web"
read -p "应用已停止？(y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "请先停止应用服务"
    exit 1
fi

# 删除当前数据库
print_warning "清空当前数据库..."
echo "DROP DATABASE $PROD_DB" | mysql -u $MYSQL_USER -p$MYSQL_PASS
print_success "数据库已清空"

# 重建数据库
echo "CREATE DATABASE $PROD_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" | mysql -u $MYSQL_USER -p$MYSQL_PASS
print_success "数据库已重建"

# 恢复备份
print_warning "恢复数据中..."
if mysql -u $MYSQL_USER -p$MYSQL_PASS $PROD_DB < $BACKUP_FILE; then
    print_success "数据恢复成功"
else
    print_error "数据恢复失败"
    echo ""
    echo "请手动恢复:"
    echo "mysql -u $MYSQL_USER -p $PROD_DB < $BACKUP_FILE"
    exit 1
fi

# 重启应用服务
print_warning "请重启应用服务"
echo "执行: pm2 start street-food-web"
read -p "应用已重启？(y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "请手动重启应用服务"
fi

# 完成
echo ""
print_success "回滚完成！"
echo ""
echo "📋 回滚信息:"
echo "  恢复的备份: $BACKUP_FILE"
echo "  回滚前备份: $CURRENT_BACKUP"
echo ""
echo "⚠️  请验证:"
echo "1. 检查应用功能"
echo "2. 验证数据完整性"
echo "3. 监控错误日志"
