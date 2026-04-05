-- 修复用户头像 URL
-- 将相对路径改为绝对路径

UPDATE users
SET avatar = CONCAT('http://10.17.237.254:3000', avatar)
WHERE avatar IS NOT NULL
  AND avatar LIKE '/uploads%';

-- 查看修复结果
SELECT id, username, LEFT(avatar, 80) as avatar_preview
FROM users
WHERE avatar IS NOT NULL
LIMIT 5;
