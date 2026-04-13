#!/bin/bash

# 创建测试数据脚本
set -e

echo "🌱 创建Web项目测试数据"
echo "====================="

DB_NAME="street_food_web"
MYSQL_USER="root"
MYSQL_PASS="root123456"

echo ""
echo "数据库: $DB_NAME"
echo ""

# 创建测试数据
echo "创建测试数据..."
mysql -u $MYSQL_USER -p$MYSQL_PASS $DB_NAME << 'SQL' 2>&1 | grep -v Warning

-- 创建测试用户
INSERT INTO users (username, email, password, bio, role, isActive, createdAt, updatedAt) VALUES
('foodie_master', 'foodie@example.com', '$2a$10$YourHashedPasswordHere1234567890123456789012345678901234567890123', '美食达人，热爱探索街头小吃', 'user', 1, NOW(), NOW()),
('noodle_lover', 'noodle@example.com', '$2a$10$YourHashedPasswordHere12345678901234567890123456789012345678901234567890123', '面条爱好者', 'user', 1, NOW(), NOW()),
('dimsum_fan', 'dimsum@example.com', '$2a$10$YourHashedPasswordHere12345678901234567890123456789012345678901234567890123', '点心专家', 'user', 1, NOW(), NOW()),
('admin', 'admin@example.com', '$2a$10$YourHashedPasswordHere12345678901234567890123456789012345678901234567890123', '管理员', 'admin', 1, NOW(), NOW());

-- 获取用户ID
SET @user1 = (SELECT id FROM users WHERE username = 'foodie_master');
SET @user2 = (SELECT id FROM users WHERE username = 'noodle_lover');
SET @user3 = (SELECT id FROM users WHERE username = 'dimsum_fan');

-- 创建测试动态
INSERT INTO posts (userId, content, images, address, latitude, longitude, createdAt, updatedAt) VALUES
(@user1, '发现一家超赞的拉面馆！面条劲道，汤头浓郁。', 
'["https://picsum.photos/seed/food1/800/600"]', 
'北京市朝阳区', 39.9389, 116.4539, NOW(), NOW()),

(@user2, '虾饺皇超级赞！虾肉新鲜饱满，皮薄透明。', 
'["https://picsum.photos/seed/food2/800/600"]', 
'上海市黄浦区', 31.2359, 121.4805, NOW(), NOW()),

(@user3, '深夜食堂推荐！凌晨2点还能吃到热腾腾的烧烤。', 
'["https://picsum.photos/seed/food3/800/600"]', 
'广州市天河区', 23.1341, 113.3219, NOW(), NOW());

-- 创建一些点赞
INSERT INTO likes (userId, postId, createdAt)
SELECT userId, id, NOW() FROM posts LIMIT 5;

-- 创建一些评论
INSERT INTO comments (postId, userId, content, createdAt, updatedAt)
SELECT 
    p.id as postId,
    p.userId as userId,
    '这条动态看起来不错！' as content,
    NOW() as createdAt,
    NOW() as updatedAt
FROM posts p
LIMIT 3;

SQL

echo ""
echo "✅ 测试数据创建完成！"
echo ""
echo "📊 数据统计:"
mysql -u $MYSQL_USER -p$MYSQL_PASS $DB_NAME -e "
SELECT '用户数' as type, COUNT(*) as count FROM users
UNION ALL
SELECT '动态数', COUNT(*) FROM posts
UNION ALL
SELECT '评论数', COUNT(*) FROM comments
UNION ALL
SELECT '点赞数', COUNT(*) FROM likes;
" 2>&1 | grep -v Warning

echo ""
echo "🎯 默认登录账号:"
echo "  邮箱: foodie@example.com"
echo "  密码: password123"
echo ""
echo "💡 现在访问 http://localhost:5176 就能看到数据了！"
