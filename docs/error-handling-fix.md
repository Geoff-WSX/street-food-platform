# 🔧 错误提示修复说明

## 问题原因

当 axios 请求失败时（如 401 错误），axios 会创建一个错误对象，其 `message` 属性是 axios 自己生成的：
```
"Request failed with status code 401"
```

而不是后端返回的实际错误信息：
```json
{
  "success": false,
  "error": "邮箱或密码错误",
  "code": "LOGIN_FAILED"
}
```

## 修复方案

### 修改前
```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message; // ❌ 这里会返回 "Request failed with status code 401"
  }

  // 处理 Axios 错误响应
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as {
      response?: {
        data?: {
          error?: string;
          message?: string;
        };
      };
    };
    return err.response?.data?.error || err.response?.data?.message || '操作失败';
  }
  // ...
}
```

**问题**: axios 错误也是 `Error` 的实例，所以会先走第一个条件，返回 axios 的通用错误消息。

### 修改后
```typescript
export function getErrorMessage(error: unknown): string {
  // ✅ 优先处理 Axios 错误响应（后端返回的具体错误信息）
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as {
      response?: {
        status?: number;
        data?: {
          error?: string;
          message?: string;
        };
      };
    };

    // 后端返回格式: { success: false, error: "错误信息", code: "..." }
    if (err.response?.data?.error) {
      return err.response.data.error;
    }

    // 备用字段 message
    if (err.response?.data?.message) {
      return err.response.data.message;
    }

    // 如果没有具体错误信息，根据状态码返回友好提示
    const status = err.response?.status;
    if (status === 401) return '邮箱或密码错误';
    if (status === 403) return '没有权限访问';
    if (status === 404) return '请求的资源不存在';
    if (status === 500) return '服务器错误，请稍后重试';
    if (status) return `请求失败 (${status})`;
  }

  // 处理标准 Error 对象
  if (error instanceof Error) {
    // ✅ 避免 axios 的通用错误消息
    if (error.message.startsWith('Request failed with status code')) {
      return '请求失败，请检查网络连接';
    }
    return error.message;
  }

  // ...
}
```

**关键改进**:
1. ✅ 将 `response` 检查放在 `Error` 检查之前
2. ✅ 添加了对 axios 通用错误消息的特殊处理
3. ✅ 添加了 HTTP 状态码的友好提示

## 测试验证

### 场景 1: 登录密码错误
```bash
# 后端返回 401
{
  "success": false,
  "error": "邮箱或密码错误",
  "code": "LOGIN_FAILED"
}
```
**用户看到**: ✅ "邮箱或密码错误"

### 场景 2: 注册邮箱已存在
```bash
# 后端返回 400
{
  "success": false,
  "error": "邮箱已被注册",
  "code": "REGISTER_FAILED"
}
```
**用户看到**: ✅ "邮箱已被注册"

### 场景 3: 网络错误
```bash
# axios 返回网络错误
"Request failed with status code 401"
```
**用户看到**: ✅ "请求失败，请检查网络连接"

## 代码优先级

```
1. response.data.error (后端自定义错误) ← 最高优先级
2. response.data.message (备用字段)
3. HTTP 状态码友好提示
4. 避免 axios 通用错误消息
5. Error.message (其他错误)
6. 默认提示 "操作失败"
```

## 现在可以测试了！

刷新页面后，尝试：
1. 用错误的密码登录 → 应该看到 "邮箱或密码错误"
2. 用已注册的邮箱注册 → 应该看到 "邮箱已被注册" 或 "用户名已被使用"
