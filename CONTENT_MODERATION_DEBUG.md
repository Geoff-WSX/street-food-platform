# 文字审查问题排查指南

## 问题描述
用户发布动态只写了"好吃"，却提示"内容包含违规词汇，请修改后重试"。

## 已修复的问题

### 1. API 响应格式处理
**问题**: 前端代码访问 `checkResult.valid` 而不是 `checkResult.data.valid`

**修复**:
- `PublishModal.tsx`: 改为 `checkResult.data.valid`
- `CommentSection.tsx`: 同样修复

### 2. 敏感词匹配逻辑优化
**问题**: 使用 `toLowerCase()` + `includes()` 可能导致边界情况

**修复**: 改用正则表达式 `new RegExp(word, 'gi')` 直接匹配原文

## 测试结果

测试输入 | 结果 | 说明
---------|------|------
好吃 | ✅ 通过 | 正常
非常好吃 | ✅ 通过 | 正常
这家店真垃圾 | ❌ 拦截 | 正确拦截
好吃极了 | ✅ 通过 | 正常

## 可能的剩余问题

### 1. 浏览器缓存
**症状**: 修复后仍然提示违规

**解决**:
1. 清除浏览器缓存
2. 刷新页面 (Cmd+Shift+R)
3. 或者无痕模式测试

### 2. 后端服务未重启
**症状**: 代码修复后仍然使用旧逻辑

**解决**:
```bash
cd backend
npm run dev
# 确保后端服务重启
```

### 3. 实际输入有其他字符
**症状**: 输入看起来是"好吃"但实际包含其他字符

**解决**:
- 检查是否有空格、特殊字符
- 重新手动输入"好吃"

## 调试步骤

### 1. 打开浏览器开发者工具
- F12 或右键 → 检查
- 切换到 Network 标签

### 2. 尝试发布"好吃"
- 在输入框输入"好吃"
- 点击发布
- 观察 Network 中的请求

### 3. 查看请求详情
找到 `/api/content/check` 请求，查看：
- **Request**: `{ "content": "好吃" }`
- **Response**:
  ```json
  {
    "valid": true,
    "violations": [],
    "message": "内容审核通过"
  }
  ```

### 4. 如果仍然报错
请截图或复制以下信息：
- 请求 URL
- Request Payload
- Response 内容
- 错误提示信息

## 快速测试命令

```bash
# 测试后端API
curl -X POST http://localhost:3001/api/content/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content":"好吃"}'

# 预期响应
{
  "valid": true,
  "violations": [],
  "message": "内容审核通过"
}
```

## 敏感词库

当前敏感词库包含以下类别：
- 脏话/侮辱性词汇
- 暴力威胁
- 色情词汇
- 违法内容
- 诈骗相关
- 政治敏感
- 其他不良信息

**注意**: "好吃"、"很好"、"不错" 等正常词汇不在敏感词库中。

## 修复后的代码位置

- `backend/src/services/post.service.ts` - 第33-47行
- `backend/src/services/comment.service.ts` - 第44-60行
- `frontend/src/components/PublishModal.tsx` - 第94-105行
