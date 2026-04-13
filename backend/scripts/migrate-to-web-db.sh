#!/bin/bash

# Web项目数据库迁移脚本
# 将共享数据库的数据迁移到独立数据库

set -e

# 配置
SHARED_DB="street_food_db"
WEB_PROD_DB="street_food_web_prod"
WEB_TEST_DB="street_food_web_test"
MYSQL_USER="root"
MYSQL_PASS="root123456"

echo "🔄 开始Web项目数据库迁移..."

# 检查生产数据库是否存在
echo "📋 检查数据库..."
DB_EXISTS=$(mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW DATABASES LIKE '$WEB_PROD_DB'" -s -N)

if [ -z "$DB_EXISTS" ]; then
    echo "✅ 创建生产数据库: $WEB_PROD_DB"
    mysql -u $MYSQL_USER -p$MYSQL_PASS -e "CREATE DATABASE $WEB_PROD_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
else
    echo "⚠️  生产数据库已存在: $WEB_PROD_DB"
    read -p "是否继续迁移？这将会清空目标数据库。(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 取消迁移"
        exit 1
    fi
fi

# 询问是否迁移数据
echo ""
echo "🤔 数据迁移选项:"
echo "1. 只迁移结构（Schema）"
echo "2. 迁移结构 + 测试数据"
echo "3. 迁移结构 + 全部数据（包括生产数据）"
read -p "请选择 (1/2/3): " -r

case $REPLY in
    1)
        echo "📋 只迁移结构..."
        ;;
    2)
        echo "🧪 迁移结构 + 测试数据..."
        ;;
    3)
        echo "⚠️  警告: 将迁移全部数据，包括生产数据！"
        read -p "确认继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ 取消迁移"
            exit 1
        fi
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

# 备份原数据库
echo ""
echo "💾 创建备份..."
BACKUP_FILE="./backups/street_food_db_backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p ./backups
mysqldump -u $MYSQL_USER -p$MYSQL_PASS $SHARED_DB > $BACKUP_FILE
echo "✅ 备份完成: $BACKUP_FILE"

# 推送Schema到新数据库
echo ""
echo "📋 推送Schema到生产数据库..."
DATABASE_URL="mysql://$MYSQL_USER:$MYSQL_PASS@localhost:3306/$WEB_PROD_DB" \
    npx prisma db push --schema=./prisma/schema.prisma

echo "✅ Schema同步完成"

# 数据迁移
if [ "$REPLY" != "1" ]; then
    echo ""
    echo "🔄 开始数据迁移..."

    if [ "$REPLY" = "2" ]; then
        # 只迁移测试数据
        echo "🧪 迁移测试数据..."
        mysql -u $MYSQL_USER -p$MYSQL_PASS $WEB_PROD_DB << EOF
INSERT INTO users (username, email, password, bio, role, isActive, createdAt)
SELECT username, email, password, bio, role, isActive, createdAt
FROM $SHARED_DB.users
WHERE email LIKE '%test%' OR email LIKE '%example.com%';

-- 迁移相关数据（按依赖顺序）
INSERT INTO posts (userId, content, images, address, latitude, longitude, isPrivate, createdAt, updatedAt)
SELECT p.userId, p.content, p.images, p.address, p.latitude, p.longitude, p.isPrivate, p.createdAt, p.updatedAt
FROM $SHARED_DB.posts p
INNER JOIN $WEB_PROD_DB.users u ON p.userId = u.id;

INSERT INTO comments (postId, userId, content, parentId, replyToUserId, likeCount, createdAt, updatedAt)
SELECT c.postId, c.userId, c.content, c.parentId, c.replyToUserId, c.likeCount, c.createdAt, c.updatedAt
FROM $SHARED_DB.comments c
INNER JOIN $WEB_PROD_DB.users u ON c.userId = u.id
INNER JOIN $WEB_PROD_DB.posts p ON c.postId = p.id;
EOF
    else
        # 迁移全部数据
        echo "📦 迁移全部数据..."
        mysqldump -u $MYSQL_USER -p$MYSQL_PASS $SHARED_DB \
            --no-create-info \
            --skip-triggers \
            --skip-add-locks \
            --single-transaction \
            | mysql -u $MYSQL_USER -p$MYSQL_PASS $WEB_PROD_DB
    fi

    echo "✅ 数据迁移完成"
fi

# 验证迁移结果
echo ""
echo "🔍 验证迁移结果..."
echo "📊 数据库统计:"

mysql -u $MYSQL_USER -p$MYSQL_PASS $WEB_PROD_DB -e "
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'comments', COUNT(*) FROM comments;
"

echo ""
echo "✅ 迁移完成！"
echo ""
echo "📋 下一步:"
echo "1. 运行测试验证数据完整性: npm test"
echo "2. 验证应用功能是否正常"
echo "3. 更新 .env.production 配置"
echo "4. 重启应用服务"
