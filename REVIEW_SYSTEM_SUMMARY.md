# 举报两级审核系统 - 实现总结

## 功能概述

实现了一个两级举报审核系统，将举报处理流程分为：
1. **审核员（小边）** - 第一级审核，判断举报是否成立
2. **管理员** - 第二级审批，最终决定举报结果

## 数据库变更

### Report 模型更新

```prisma
model Report {
  id             Int      @id @default(autoincrement())
  reporterId     Int      // 举报人
  reportedId     Int      // 被举报人
  type           String   @db.VarChar(50)
  description    String?  @db.Text
  images         String?  @db.Text
  chatRecords    String?  @db.Text
  status         String   @default("pending") @db.VarChar(20)
  reviewerNote   String?  @db.Text         // 审核员备注
  reviewerId     Int?                      // 审核员ID
  reviewedAt     DateTime?                // 审核时间
  adminNote      String?  @db.Text         // 管理员备注
  adminId        Int?                      // 管理员ID
  adminAt        DateTime?                // 管理员审批时间
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  reporter User   @relation("Reporter", fields: [reporterId], references: [id])
  reported User   @relation("Reported", fields: [reportedId], references: [id])
  reviewer User?  @relation("Reviewer", fields: [reviewerId], references: [id])
  admin    User?  @relation("Admin", fields: [adminId], references: [id])
}
```

### 举报状态

| 状态 | 说明 |
|------|------|
| `pending` | 待审核员处理 |
| `reviewing` | 审核员已处理，待管理员审批 |
| `resolved` | 管理员批准，举报成立 |
| `rejected` | 管理员驳回，举报不成立 |

### 用户角色

| 角色 | 权限 |
|------|------|
| `user` | 普通用户，可以创建举报 |
| `reviewer` | 审核员，可以处理待审核的举报 |
| `admin` | 管理员，可以审批举报和管理用户角色 |

## API 接口

### 审核员接口

```
PUT /api/reports/:id/review
```

**请求体：**
```json
{
  "reviewerNote": "审核备注",
  "recommendation": "approve" | "reject"
}
```

**权限：** 需要 `reviewer` 或 `admin` 角色

**功能：** 审核员处理举报，将状态从 `pending` 改为 `reviewing`

### 管理员接口

```
PUT /api/reports/:id/handle
```

**请求体：**
```json
{
  "status": "resolved" | "rejected",
  "adminNote": "管理员备注"
}
```

**权限：** 需要 `admin` 角色

**功能：** 管理员最终审批，将状态改为 `resolved` 或 `rejected`

### 其他接口

```
GET  /api/reports/all        - 获取举报列表（审核员和管理员）
GET  /api/reports/:id        - 获取举报详情（管理员）
GET  /api/reports/stats      - 获取举报统计（管理员）
POST /api/reports            - 创建举报（所有登录用户）
GET  /api/reports/my         - 获取我的举报列表（所有登录用户）
```

## 审核流程

```
用户提交举报
    ↓
pending (待审核员处理)
    ↓
审核员审核 → reviewing (待管理员审批)
    ↓
管理员审批
    ↓
resolved (成立) / rejected (驳回)
```

## 后端实现

### 新增中间件

`backend/src/middleware/admin.ts`
```typescript
export const requireReviewer = (req, res, next) => {
  if (req.user?.role !== 'reviewer' && req.user?.role !== 'admin') {
    return errorResponse(res, '需要审核员或管理员权限', 'REVIEWER_REQUIRED', 403);
  }
  next();
};
```

### 新增控制器函数

`backend/src/controllers/report.controller.ts`

**审核员处理举报：**
```typescript
export const reviewReport = async (req: AuthRequest, res: Response) => {
  const { reviewerNote, recommendation } = req.body;
  // 将举报状态从 pending 改为 reviewing
  // 记录审核员ID、审核时间和备注
};
```

**管理员审批：**
```typescript
export const handleReport = async (req: AuthRequest, res: Response) => {
  const { status, adminNote } = req.body;
  // 将举报状态改为 resolved 或 rejected
  // 记录管理员ID、审批时间和备注
};
```

## 使用示例

### 1. 创建审核员账号

管理员在用户管理页面将用户角色设置为 `reviewer`

### 2. 审核员处理举报

```typescript
// 审核员登录后
await reviewReport(reportId, {
  reviewerNote: "该用户确实发送了垃圾信息",
  recommendation: "approve"  // 建议成立
});
```

### 3. 管理员审批

```typescript
// 管理员审批审核员的建议
await handleReport(reportId, {
  status: "resolved",  // 批准，举报成立
  adminNote: "同意审核员意见，已对该用户进行警告"
});
```

## 前端实现建议

### 审核员界面

1. 显示待审核举报列表 (`status: pending`)
2. 查看举报详情（证据、聊天记录等）
3. 提交审核意见（批准/驳回 + 备注）

### 管理员界面

1. 显示待审批举报列表 (`status: reviewing`)
2. 查看审核员的意见和备注
3. 最终审批（成立/驳回）
4. 可以对被举报用户进行处罚（禁用账号等）

## 数据库迁移

```bash
# 迁移文件：20260326092345_add_reviewer_role
npx prisma migrate deploy
```

## 注意事项

1. **角色权限**：只有管理员可以设置用户的 `reviewer` 角色
2. **状态流转**：`pending` → `reviewing` → `resolved/rejected`
3. **审核记录**：审核员和管理员的操作都会被记录（ID、时间、备注）
4. **灵活性**：管理员也可以直接处理 `pending` 状态的举报，跳过审核员步骤
