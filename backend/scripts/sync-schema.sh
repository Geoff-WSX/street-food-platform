#!/bin/bash

# Schema同步脚本
# 在测试环境验证Schema后，同步到生产环境

set -e

echo "🔄 Schema同步流程"
echo "=================="

# 配置
TEST_DB="street_food_web_test"
PROD_DB="street_food_web_prod"
MYSQL_USER="root"
MYSQL_PASS="root123456"

echo ""
echo "📋 第一步: 在测试环境验证Schema"
echo "======================================="

# 检查测试环境
echo "检查测试数据库..."
DATABASE_URL="mysql://$MYSQL_USER:$MYSQL_PASS@localhost:3306/$TEST_DB" \
    npx prisma db push --schema=./prisma/schema.prisma

echo "✅ 测试环境Schema已更新"

# 运行测试
echo ""
echo "🧪 第二步: 运行测试验证"
echo "======================"

read -p "是否运行测试套件？(Y/n): " -r
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "运行测试..."
    NODE_ENV=test npm test

    if [ $? -eq 0 ]; then
        echo "✅ 测试通过"
    else
        echo "❌ 测试失败"
        echo "请修复问题后重试"
        exit 1
    fi
fi

# 确认同步到生产
echo ""
echo "⚠️  第三步: 同步到生产环境"
echo "=========================="
echo "警告: 这将更新生产数据库Schema！"
echo "建议: 先备份生产数据库"

read -p "是否继续？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消同步"
    exit 0
fi

# 备份生产数据库
echo ""
echo "💾 备份生产数据库..."
BACKUP_FILE="./backups/${PROD_DB}_schema_backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p ./backups
mysqldump -u $MYSQL_USER -p$MYSQL_PASS --no-data $PROD_DB > $BACKUP_FILE
echo "✅ 备份完成: $BACKUP_FILE"

# 同步到生产
echo ""
echo "📋 同步Schema到生产环境..."
DATABASE_URL="mysql://$MYSQL_USER:$MYSQL_PASS@localhost:3306/$PROD_DB" \
    npx prisma db push --schema=./prisma/schema.prisma

echo "✅ 生产环境Schema已更新"

echo ""
echo "🎉 同步完成！"
echo ""
echo "📋 后续步骤:"
echo "1. 验证生产应用功能"
echo "2. 监控错误日志"
echo "3. 准备回滚计划（如有需要）"
