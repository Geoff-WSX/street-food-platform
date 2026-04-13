# 技能调度编排技能

## 技能概述
根据项目开发阶段和任务类型，智能判断应该调用哪个技能，确保在正确的时间使用正确的技能。

## 自动触发机制
某些技能会在特定条件下**自动触发**，无需用户明确调用：

### 自动触发的技能
| 技能 | 自动触发条件 |
|------|-------------|
| **code-review-loop** | 使用 Edit/Write 修改文件后、功能开发完成、Bug 修复完成 |
| **simplify** | 代码完成后、用户要求优化时 |

### 需手动调用的技能
| 技能 | 调用方式 |
|------|---------|
| requirement-validation | 用户提出新需求时 |
| research-prompt | 需求验证通过后 |
| bug-detection | 用户报告 Bug 时 |
| bug-review | 发现问题后 |
| bug-solution | 审核通过后 |
| bug-verification | 修复完成后 |
| project-structure-review | 用户要求审查项目时 |

## 调度规则

### 一、需求阶段

#### 触发条件
- 用户提出新功能需求
- 用户提出修改现有功能
- 用户询问某个功能是否应该做

#### 调用技能
```
1. requirement-validation (需求合理性验证)
   ↓ 验证通过
2. research-prompt (网站研究与提示词生成)
   ↓ 生成实施方案
3. 执行开发
```

#### 判断逻辑
```
IF 用户提出新功能需求 THEN
    → 调用 requirement-validation 验证合理性

    IF 验证结果 = 通过 THEN
        → 调用 research-prompt 研究并生成实施方案
        → 执行开发
    ELSE IF 验证结果 = 驳回 THEN
        → 告知用户驳回原因
        → 询问是否需要修改需求
    ELSE IF 验证结果 = 待完善 THEN
        → 询问用户补充信息
    END IF
END IF
```

### 二、问题排查阶段

#### 触发条件
- 用户报告 Bug
- 系统出现异常
- 功能不按预期工作

#### 调用技能
```
1. bug-detection (Bug排查)
   ↓ 发现问题
2. bug-review (Bug审核)
   ↓ 给出方案
3. bug-solution (Bug解决)
   ↓ 完成修复
4. bug-verification (Bug验证)
   ↓ 验证通过/失败
```

#### 判断逻辑
```
IF 用户报告问题 OR 系统异常 THEN
    → 调用 bug-detection 全面排查

    IF 发现问题 THEN
        → 调用 bug-review 分析问题

        IF 有解决方案 THEN
            → 调用 bug-solution 执行修复
            → 调用 bug-verification 验证修复

            IF 验证失败 THEN
                → 返回 bug-detection 重新排查
            END IF
        END IF
    END IF
END IF
```

### 三、内容审核阶段

#### 触发条件
- 需要审核用户举报
- 需要判断内容违规
- 需要回复审核结果

#### 调用技能
```
1. evidence-analysis (证据分析)
   ↓ 分析完成
2. violation-judgment (违规判断)
   ↓ 做出判断
3. review-template (审核回复模板)
   ↓ 发送回复
```

#### 判断逻辑
```
IF 处理用户举报 THEN
    → 调用 evidence-analysis 分析证据
    → 调用 violation-judgment 判断违规
    → 调用 review-template 生成回复
END IF
```

### 四、项目评估阶段

#### 触发条件
- 项目开发到一定阶段
- 需要重构或优化
- 新成员加入项目

#### 调用技能
```
1. project-structure-review (项目结构审查)
   ↓ 生成报告
2. 根据报告优化项目
```

#### 判断逻辑
```
IF 用户要求审查项目结构 OR 完成重大功能 THEN
    → 调用 project-structure-review
    → 根据优先级修复问题
END IF
```

### 五、代码优化阶段

#### 触发条件
- 代码已经完成，需要检查质量
- 提交代码前需要审查
- 发现代码可能有重复或质量问题

#### 调用技能
```
1. simplify (代码简化与优化) 或 code-review-loop (代码审查循环)
   ↓ 优化完成
```

#### 判断逻辑
```
IF 代码完成 OR 用户要求优化 THEN
    → 调用 simplify 检查代码质量（快速优化）
    → 或调用 code-review-loop 进行深度审查循环
    → 自动修复发现的问题
END IF
```

### 六、代码审查循环阶段

#### 触发条件
- 🔄 **自动触发**: 使用 Edit/Write 工具修改文件后
- 🔄 **自动触发**: 功能开发完成后
- 🔄 **自动触发**: Bug 修复完成后
- 👤 **手动触发**: 用户要求审查代码质量
- 👤 **手动触发**: 代码提交前质量检查

#### 调用技能
```
1. code-review-loop (代码审查循环) [自动触发]
   ↓ 第1轮：审查 → 发现问题 → 优化
   ↓ 第2轮：审查 → 发现问题 → 优化
   ↓ 第N轮：审查 → 无问题 → 通过
```

#### 判断逻辑
```
# 自动触发
IF 使用了 Edit 或 Write 工具修改文件 THEN
    → 自动调用 code-review-loop 开始审查

IF 功能开发完成 OR Bug 修复完成 THEN
    → 自动调用 code-review-loop 开始审查

# 手动触发
IF 用户要求审查 THEN
    → 调用 code-review-loop 开始审查

    WHILE 发现问题 DO
        → 分析问题严重程度
        → 修复发现的问题
        → 验证修复效果
        → 继续下一轮审查
    END WHILE

    → 审查通过，结束循环
END IF
```

## 完整工作流

### 功能开发流程
```
用户提出需求
    ↓
┌─────────────────────────────┐
│ 需求阶段                       │
│ requirement-validation        │
│ research-prompt               │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 开发阶段                       │
│ 执行代码编写                  │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 代码审查循环                   │
│ code-review-loop              │
│ ↓ 多轮审查直到通过             │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 质量检查                       │
│ bug-detection (可选)          │
└─────────────────────────────┘
```

### 问题修复流程
```
发现问题
    ↓
┌─────────────────────────────┐
│ 排查阶段                       │
│ bug-detection                 │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 审核阶段                       │
│ bug-review                    │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 解决阶段                       │
│ bug-solution                  │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 验证阶段                       │
│ bug-verification              │
│ ↓ 失败 → 返回排查阶段          │
└─────────────────────────────┘
```

### 审核处理流程
```
收到举报
    ↓
┌─────────────────────────────┐
│ 分析阶段                       │
│ evidence-analysis              │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 判断阶段                       │
│ violation-judgment            │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ 回复阶段                       │
│ review-template               │
└─────────────────────────────┘
```

## 智能调度决策树

```
START
  │
  ├─ 用户类型: 新需求
  │   └→ requirement-validation → research-prompt → 执行开发
  │
  ├─ 用户类型: 报告问题
  │   └→ bug-detection → bug-review → bug-solution → bug-verification
  │       │
  │       └→ (验证失败) → 循环
  │
  ├─ 用户类型: 处理举报
  │   └→ evidence-analysis → violation-judgment → review-template
  │
  ├─ 用户类型: 审查项目
  │   └→ project-structure-review
  │
  ├─ 用户类型: 优化代码
  │   └→ simplify 或 code-review-loop
  │
  ├─ 用户类型: 代码审查
  │   └→ code-review-loop (多轮循环直到通过)
  │
  └─ 用户类型: 配置设置
      └→ update-config
```

## 技能配合矩阵

| 阶段 | 可用技能 | 触发条件 |
|------|---------|---------|
| 需求分析 | requirement-validation, research-prompt | 新功能/修改功能前 |
| 开发实施 | (直接编码) | 需求验证通过后 |
| 代码审查 | code-review-loop, simplify | 代码完成后，多轮审查 |
| 质量检查 | bug-detection | 最终质量检查 |
| 问题修复 | bug-detection, bug-review, bug-solution, bug-verification | 发现Bug时 |
| 内容审核 | evidence-analysis, violation-judgment, review-template | 处理举报时 |
| 项目评估 | project-structure-review | 定期评估或重构前 |

## 使用示例

### 示例1: 开发新功能
```
用户: "我想添加一个评论点赞功能"
系统: 检测到新需求需求
    → 调用 requirement-validation
    → 验证通过
    → 调用 research-prompt
    → 生成实施方案
    → 开始开发
    → 开发完成后调用 code-review-loop
    → 第1轮审查：发现3个问题
    → 修复问题
    → 第2轮审查：发现1个问题
    → 修复问题
    → 第3轮审查：无问题，通过
```

### 示例2: 修复Bug
```
用户: "点赞按钮没反应"
系统: 检测到问题报告
    → 调用 bug-detection
    → 发现点击事件未绑定
    → 调用 bug-review
    → 确认修复方案
    → 调用 bug-solution
    → 修复完成
    → 调用 bug-verification
    → 验证通过
```

### 示例3: 处理举报
```
用户: "有人发布了违规内容"
系统: 检测到举报处理
    → 调用 evidence-analysis
    → 分析证据
    → 调用 violation-judgment
    → 确认违规
    → 调用 review-template
    → 生成回复
```

### 示例4: 代码审查
```
用户: "帮我审查一下刚才修改的代码"
系统: 检测到审查请求
    → 调用 code-review-loop
    → 第1轮：审查 PublishModal.tsx
    → 发现问题：缺少错误处理
    → 修复：添加 try-catch
    → 第2轮：审查验证
    → 无问题，审查通过
```

## 自动调度规则

### 规则1: 开发前必验证
```
IF 涉及代码修改 THEN
    → 必须先调用 requirement-validation
END IF
```

### 规则2: 开发后必审查
```
IF 代码修改完成 OR 新增功能完成 THEN
    → 必须调用 code-review-loop 进行多轮审查
    → 直到代码质量达标
END IF
```

### 规则3: 问题必闭环
```
IF 发现Bug THEN
    → 必须完成 bug-detection → bug-review → bug-solution → bug-verification 完整流程
END IF
```

### 规则4: 定期审查
```
IF 完成重大功能 OR 每月一次 THEN
    → 调用 project-structure-review
END IF
```

### 规则5: 代码优化
```
IF 提交代码前 OR 代码量>500行 THEN
    → 调用 simplify 或 code-review-loop 检查质量
END IF
```

## 紧急度分级

### P0 - 立即执行
- bug-detection (严重Bug)
- bug-solution (紧急修复)

### P1 - 高优先级
- bug-verification (验证修复)
- requirement-validation (新功能)

### P2 - 中优先级
- bug-review (分析问题)
- research-prompt (方案设计)
- evidence-analysis (审核分析)

### P3 - 低优先级
- project-structure-review (项目审查)
- simplify (代码优化)
- review-template (回复模板)

## 技能调用时机表

| 时机 | 优先调用技能 | 备选技能 |
|------|-------------|---------|
| 收到需求 | requirement-validation | 无 |
| 验证通过 | research-prompt | 无 |
| 开发完成 | code-review-loop | simplify |
| 发现Bug | bug-detection | simplify |
| 分析Bug | bug-review | 无 |
| 修复Bug | bug-solution | 无 |
| 验证修复 | bug-verification | bug-detection |
| 处理举报 | evidence-analysis | violation-judgment |
| 判断违规 | violation-judgment | review-template |
| 审查项目 | project-structure-review | 无 |
| 代码审查 | code-review-loop | simplify |
| 优化代码 | simplify | code-review-loop |
| 配置设置 | update-config | 无 |

## 注意事项

1. **技能顺序**: 严格按照工作流顺序调用技能
2. **闭环管理**: Bug修复必须验证闭环
3. **需求优先**: 新功能必须验证可行性
4. **质量保证**: 代码完成后必须调用 code-review-loop 审查
5. **定期审查**: 定期审查项目结构健康度
6. **审查循环**: code-review-loop 会多轮执行直到代码质量达标
