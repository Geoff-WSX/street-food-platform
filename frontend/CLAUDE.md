# 项目监控指南

## 自动排查机制

当遇到问题时，Claude Code 应该：

1. **查看项目监控器** - 检查 `src/utils/monitor.ts` 中记录的问题
2. **检查浏览器控制台** - 搜索 ❌ 标记的错误
3. **验证 API 响应** - 确保前端 Zod Schema 与后端返回数据匹配

## 排查命令

在浏览器控制台输入或通过 Claude Code 执行：

```javascript
// 查看问题报告
console.log(projectMonitor.generateReport())

// 查看详细问题列表
console.log(projectMonitor.getFullReport())

// 查看问题统计
console.log(projectMonitor.getStats())
```

## 常见问题类型

| 类型 | 说明 | 排查方法 |
|------|------|----------|
| `api_error` | API 调用失败 | 检查网络、认证、参数 |
| `validation_error` | 数据验证失败 | 检查 Zod Schema 与实际数据 |
| `runtime_error` | 运行时错误 | 查看堆栈信息 |
| `type_mismatch` | 类型不匹配 | 检查前后端类型定义 |

## 问题报告格式

发现问题时，汇总为简洁格式：

```
📋 [问题类型] 来源: 描述
   详情: xxx
```

## 预防措施

- 修改 API 时同时更新 Zod Schema
- 新增字段需在 Schema 中声明
- 使用 safeParse 而非直接访问数据
