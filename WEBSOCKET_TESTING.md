# WebSocket 测试文档

## 概述

本文档描述了街头美食社交平台的 WebSocket 功能测试覆盖范围。

## 测试文件结构

### 后端测试
```
backend/src/websocket/__tests__/
├── websocket.server.test.ts      # 服务器功能测试
├── websocket.integration.test.ts # 集成测试
└── websocket.stress.test.ts      # 压力测试
```

### 前端测试
```
frontend/src/services/__tests__/
└── websocket.test.ts             # 客户端 WebSocket 服务测试
```

## 测试覆盖范围

### 1. 连接管理测试

#### 后端测试 (`websocket.server.test.ts`)
- ✅ 成功建立连接并返回 connected 消息
- ✅ 拒绝无效 token 的连接
- ✅ 拒绝不存在的用户连接
- ✅ 拒绝已禁用的用户连接
- ✅ 拒绝没有 token 的连接
- ✅ 正确跟踪在线用户
- ✅ 用户断开连接时更新在线用户列表

#### 前端测试 (`websocket.test.ts`)
- ✅ 成功建立 WebSocket 连接
- ✅ 处理连接成功消息
- ✅ 处理连接错误
- ✅ 断开连接
- ✅ 防止重复连接
- ✅ 处理快速连续的连接和断开

### 2. 心跳检测测试

#### 后端测试
- ✅ 接收并响应心跳 ping 消息
- ✅ 定期发送心跳（30秒间隔）

#### 前端测试
- ✅ 响应 ping 消息
- ✅ 定期发送心跳
- ✅ 在断开连接时停止心跳

### 3. 消息发送和接收测试

#### 后端测试
- ✅ 向指定用户发送消息
- ✅ 向多个用户发送消息
- ✅ 广播消息给所有在线用户
- ✅ 处理向离线用户发送消息的情况
- ✅ 处理无效的 JSON 消息
- ✅ 处理 WebSocket 错误

#### 前端测试
- ✅ 处理通知消息
- ✅ 处理私信消息
- ✅ 处理好友请求消息
- ✅ 处理好友请求接受消息
- ✅ 处理错误消息
- ✅ 忽略无效的 JSON 消息
- ✅ 发送消息到服务器
- ✅ 在连接未建立时不发送消息

### 4. 实时通知推送测试

#### 集成测试 (`websocket.integration.test.ts`)
- ✅ 集成通知系统推送实时通知
- ✅ 集成消息系统推送实时消息
- ✅ 推送好友请求通知
- ✅ 推送好友请求接受通知
- ✅ 防止向自己发送通知
- ✅ 在数据库中持久化通知

### 5. 断线重连测试

#### 前端测试
- ✅ 在连接断开后尝试重连
- ✅ 使用指数退避策略重连
- ✅ 在达到最大重连次数后停止

#### 集成测试
- ✅ 处理网络中断后重连

### 6. 消息队列和重传测试

#### 后端测试
- ✅ 处理连接关闭时的消息发送

### 7. 浏览器通知测试

#### 前端测试
- ✅ 请求通知权限
- ✅ 在收到消息时显示浏览器通知
- ✅ 在收到通知时显示浏览器通知

### 8. 性能和压力测试

#### 压力测试 (`websocket.stress.test.ts`)
- ✅ 处理 1000 个并发连接
- ✅ 处理每秒 10000 条消息
- ✅ 在大量消息后保持内存稳定
- ✅ 在频繁连接断开时保持稳定
- ✅ 从网络错误中恢复
- ✅ 同时处理连接、消息和断开
- ✅ 在长时间运行下保持稳定

## 运行测试

### 安装测试依赖

#### 后端
```bash
cd backend
npm install --save-dev jest @types/jest ts-jest @types/ws
```

#### 前端
```bash
cd frontend
npm install --save-dev jest @types/jest ts-jest @testing-library/jest-dom
```

### 运行所有测试
```bash
# 使用提供的脚本
./scripts/test-websocket.sh

# 或手动运行
cd backend && npm test -- --testPathPattern=websocket
cd frontend && npm test -- --testPathPattern=websocket
```

### 运行特定测试套件

#### 后端服务器测试
```bash
cd backend
npm test -- websocket.server.test.ts
```

#### 后端集成测试
```bash
cd backend
npm test -- websocket.integration.test.ts
```

#### 后端压力测试
```bash
cd backend
npm test -- websocket.stress.test.ts
```

#### 前端测试
```bash
cd frontend
npm test -- websocket.test.ts
```

### 生成覆盖率报告
```bash
# 后端
cd backend
npm test -- --coverage --testPathPattern=websocket

# 前端
cd frontend
npm test -- --coverage --testPathPattern=websocket
```

## 测试要求

### 功能要求
- 所有测试用例必须通过
- 代码覆盖率应达到 90% 以上
- 所有关键路径必须有测试覆盖

### 性能要求
- 连接建立时间 < 100ms
- 消息发送延迟 < 50ms
- 支持 1000+ 并发连接
- 消息吞吐量 > 10000 消息/秒

### 稳定性要求
- 长时间运行无内存泄漏
- 网络错误后自动恢复
- 高并发下保持稳定

## 持续集成

测试应该在以下情况下自动运行：
- 每次 Pull Request
- 每次提交到主分支
- 每日定时运行（压力测试）

## 故障排查

### 常见问题

1. **连接失败**
   - 检查 JWT_SECRET 配置
   - 验证用户数据 Mock 是否正确

2. **测试超时**
   - 增加 jest.setTimeout 值
   - 检查异步操作是否正确处理

3. **内存泄漏**
   - 运行压力测试并监控内存使用
   - 确保事件监听器正确清理

## 测试最佳实践

1. **隔离性**: 每个测试应该独立运行
2. **可重复性**: 测试结果应该一致
3. **快速性**: 单元测试应该快速完成
4. **清晰性**: 测试名称应该描述测试内容
5. **维护性**: 测试代码应该易于理解和修改

## 未来改进

- [ ] 添加 WebSocket 协议一致性测试
- [ ] 添加更多安全测试（XSS、注入等）
- [ ] 添加跨浏览器测试
- [ ] 添加移动设备网络条件测试
- [ ] 添加 WebSocket 扩展协议测试

## 联系方式

如有问题或建议，请联系开发团队。
