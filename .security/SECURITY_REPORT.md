# 安全漏洞扫描报告

**扫描时间**: 2026/05/22
**项目**: 街头美食社交平台
**扫描工具**: gitleaks 8.30.1, semgrep 1.157.0, npm audit
**扫描深度**: quick

---

## 执行摘要

| 扫描项 | 工具 | 发现数量 |
|--------|------|----------|
| 密钥泄露 | gitleaks | 15 (含7处项目自身 + 8处第三方库误报) |
| 后端依赖漏洞 | npm audit | 11 |
| 前端依赖漏洞 | npm audit | 7 |
| SAST 代码安全 | semgrep | 28 |

---

## 🔴 CRITICAL - 密钥泄露 (7处项目自身)

| 文件 | 泄露类型 | 说明 |
|------|----------|------|
| `backend/.env:22` | OpenAI API Key | `sk-vr6NglbJ3HiuV20u1Z9kLzWMYI4...` |
| `backend/.env:30` | 七牛云 Access Key | `iMgIOsY-GcBnHt7eS79No4cruQ...` |
| `backend/.env:31` | 七牛云 Secret Key | `UoQgp-Q6b_SO_KNyRfJjh86pQ...` |
| `backend/src/controllers/location.controller.ts:24` | 高德地图 API Key | `333c34192208527e8d2a2e574d1e9693` |
| `backend/dist/...` | 高德地图 API Key | 编译后代码中的密钥 |
| `frontend/index.html:27` | 高德地图 API Key | 前端暴露 |
| `frontend/dist/index.html:27` | 高德地图 API Key | 编译产物暴露 |

**⚠️ 紧急建议**: 以上密钥可能已被提交至 Git 历史，请立即吊销并更换。

**注**: node_modules 中检测到 8 处密钥为第三方库测试代码，属于误报，无需处理。

---

## 🟠 HIGH - 依赖项漏洞

### 后端 (backend) - 11 个漏洞

| 依赖包 | 严重度 | 漏洞数 | 修复版本 |
|--------|--------|--------|----------|
| **axios** | HIGH | 14+ | ≥1.15.2 |
| **@mapbox/node-pre-gyp** | HIGH | 1 | ≤1.0.11 |
| **path-to-regexp** | HIGH | 1 | ≥0.1.13 |
| **lodash** | HIGH | 2 | ≥4.17.24 |
| picomatch | HIGH | 1 | 需更新 |
| brace-expansion | MODERATE | 3 | ≥5.0.6 |
| follow-redirects | MODERATE | 1 | ≥1.15.12 |
| express-rate-limit | MODERATE | 1 | 需更新 |
| ip-address | MODERATE | 1 | 需更新 |

### 前端 (frontend) - 7 个漏洞

| 依赖包 | 严重度 | 漏洞数 | 修复版本 |
|--------|--------|--------|----------|
| **axios** | HIGH | 14+ | ≥1.15.2 |
| **picomatch** | HIGH | 1 | 需更新 |
| **postcss** | MODERATE | 1 | ≥8.5.10 |
| brace-expansion | MODERATE | 3 | ≥5.0.6 |
| follow-redirects | MODERATE | 1 | ≥1.15.12 |

**重点**: axios 有多个高危漏洞（原型污染、SSRF、CRLF注入），必须优先升级。

---

## 🟡 MEDIUM/HIGH - 代码安全问题 (SAST 28处)

### 命令注入风险 (ERROR)
| 文件 | 行号 | 说明 |
|------|------|------|
| `ai.controller.ts` | 642 | 检测到 child_process 调用 |

### ReDoS 风险 (WARNING)
| 文件 | 行号 | 说明 |
|------|------|------|
| `location.controller.ts` | 147-149 | 用户输入直接用于 RegExp |
| `redis.ts` | 208 | 缓存键可能含用户输入 |
| `moderation.service.ts` | 138 | 审核配置正则问题 |

### GitHub Actions 安全 (ERROR)
| 文件 | 行号 | 说明 |
|------|------|------|
| `deploy.yml` | 27 | github context 数据用于 shell 拼接 |

### 格式化字符串 (INFO)
| 文件 | 行号 |
|------|------|
| `ai.controller.ts` | 1356, 1398, 1400 |
| `level.service.ts` | 592 |
| `websocket/index.ts` | 103, 204 |

### 其他
| 文件 | 行号 | 说明 |
|------|------|------|
| `deploy-backend.sh` | 40 | curl pipe bash 风险 |
| `index.html` | 27 | 缺失 SRI 完整性校验 |

**注**: seed-test-data.sh 中的 bcrypt 检测为测试数据误报。

---

## 📋 修复建议

### P0 - 立即修复
1. **吊销并更换** `backend/.env` 中所有密钥 (OpenAI, 七牛云)
2. **移除**前端和源码中硬编码的高德地图 API Key
3. **升级 axios** 到 ≥1.15.2

### P1 - 尽快修复
1. 修复 `ai.controller.ts:642` 命令注入风险
2. 修复 `location.controller.ts:147-149` ReDoS 风险
3. 升级 lodash 到 ≥4.17.24
4. 升级 path-to-regexp 到 ≥0.1.13

### P2 - 计划修复
1. 替换 console.log 为结构化日志
2. 添加资源完整性校验 (SRI)
3. 修复 GitHub Actions shell 注入
4. 升级 express-rate-limit

---

## 📁 详细结果文件
- `.security/gitleaks.json` - 密钥泄露详情
- `.security/npm-audit-backend.json` - 后端依赖漏洞
- `.security/npm-audit-frontend.json` - 前端依赖漏洞
- `.security/semgrep.json` - SAST 完整结果
