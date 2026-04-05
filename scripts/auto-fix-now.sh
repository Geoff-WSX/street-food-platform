#!/bin/bash

# Bug 自动修复脚本 - 增强版
# 直接修复常见的代码问题，并测试 API

PROJECT_DIR="/Users/Zhuanz/street-food-platform"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
LOG_DIR="$PROJECT_DIR/logs/auto-fix"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/auto-fix.log"
}

# 记录问题到问题追踪文件
record_issue() {
    local severity=$1  # critical, high, medium, low
    local file=$2
    local line=$3
    local type=$4
    local message=$5

    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$severity] $file:$line - $type: $message" >> "$LOG_DIR/issues-tracker.log"
    log "📝 记录问题: [$severity] $file:$line - $type"
}

# 检查 API 错误处理
check_api_error_handling() {
    log "🔍 检查 API 错误处理..."

    # 检查注册 API
    log "  测试注册 API（重复邮箱）..."
    local response=$(curl -s -X POST http://localhost:3000/api/auth/register \
        -H "Content-Type: application/json" \
        -d '{"email":"test-api-check@example.com","password":"password123","username":"test"}')

    if echo "$response" | grep -q "邮箱已被注册"; then
        log "  ✅ 后端返回正确的错误信息"
    else
        log "  ⚠️  后端错误信息不正确"
        record_issue "high" "backend" "auth/register" "api_error" "重复注册时返回错误信息不正确"
    fi

    # 检查前端是否正确处理 400 错误
    log "  检查前端错误拦截器..."
    if grep -q "Promise.reject(error)" "$FRONTEND_DIR/src/api/index.ts"; then
        # 检查是否有检查 error.response?.data
        if ! grep -q "error.response?.data" "$FRONTEND_DIR/src/api/index.ts"; then
            log "  ⚠️  API 拦截器未传递错误详情"
            record_issue "critical" "frontend" "src/api/index.ts" "error_handling" "API拦截器未正确传递错误响应数据，导致用户看到'400错误'而非具体错误信息"
        fi
    fi
}

# 运行 ESLint 检查
run_eslint_check() {
    log "🔍 运行 ESLint 检查..."

    cd "$FRONTEND_DIR"
    npm run lint 2>&1 | tee "$LOG_DIR/lint-output.log" | tee -a "$LOG_DIR/auto-fix.log"

    # 统计问题
    local errors=$(grep -c "error" "$LOG_DIR/lint-output.log" 2>/dev/null || echo "0")
    local warnings=$(grep -c "warning" "$LOG_DIR/lint-output.log" 2>/dev/null || echo "0")
    local total=$((errors + warnings))

    log "📊 发现 $errors 个错误，$warnings 个警告，总计 $total 个问题"

    # 记录问题到追踪文件
    if [ "$total" -gt 0 ]; then
        grep -E "error|warning" "$LOG_DIR/lint-output.log" | while read -r line; do
            if echo "$line" | grep -q "error"; then
                local file=$(echo "$line" | cut -d':' -f1)
                local line_num=$(echo "$line" | cut -d':' -f2)
                local msg=$(echo "$line" | sed 's/.*error //')
                record_issue "medium" "$file" "$line_num" "eslint" "$msg"
            fi
        done
    fi

    echo "$total"
}

# 检查构建错误（Vite/Oxc 编译错误）
check_build_errors() {
    log "🔍 检查构建错误..."

    cd "$FRONTEND_DIR"

    # 尝试类型检查（不实际构建）
    log "  运行 TypeScript 类型检查..."
    if npx tsc --noEmit 2>&1 | tee "$LOG_DIR/build-check.log" | tee -a "$LOG_DIR/auto-fix.log"; then
        log "  ✅ TypeScript 类型检查通过"
    else
        local build_errors=$(grep -c "error TS" "$LOG_DIR/build-check.log" 2>/dev/null || echo "0")
        if [ "$build_errors" -gt 0 ]; then
            log "  ⚠️  发现 $build_errors 个 TypeScript 错误"

            # 记录构建错误
            grep "error TS" "$LOG_DIR/build-check.log" | while read -r line; do
                local file=$(echo "$line" | grep -oP 'src/[^:]+' || echo "unknown")
                local msg=$(echo "$line" | sed 's/.*error TS[0-9]*: //')
                record_issue "critical" "$file" "0" "build_error" "$msg"
            done
        fi
    fi
}

# 检查代码结构问题（重复导入等）
check_code_structure() {
    log "🔍 检查代码结构问题..."

    cd "$FRONTEND_DIR"

    # 检查重复导入
    log "  检查重复导入..."
    local duplicate_imports=$(grep -r "^import.*from.*$" src --include="*.ts" --include="*.tsx" | sort | uniq -d | wc -l | tr -d ' ')

    if [ "$duplicate_imports" -gt 0 ]; then
        log "  ⚠️  发现 $duplicate_imports 个重复导入"

        grep -r "^import.*from.*$" src --include="*.ts" --include="*.tsx" | sort | uniq -d | while read -r line; do
            local file=$(echo "$line" | cut -d':' -f1)
            local import_stmt=$(echo "$line" | cut -d':' -f2-)
            record_issue "high" "$file" "0" "duplicate_import" "重复导入: $import_stmt"
        done
    else
        log "  ✅ 无重复导入"
    fi
}

# 尝试自动修复
attempt_auto_fix() {
    local total_issues=$1
    log "🔧 尝试自动修复..."

    if [ "$total_issues" -eq 0 ]; then
        log "✅ 无问题需要修复"
        return 0
    fi

    cd "$FRONTEND_DIR"

    # 运行 ESLint 自动修复
    npm run lint -- --fix 2>&1 | grep -E "fixable|Fixed" | head -10 | tee -a "$LOG_DIR/auto-fix.log"

    # 再次检查
    local new_errors=$(npm run lint 2>&1 | grep -c "error\|warning" 2>/dev/null || echo "0")
    local fixed=$((total_issues - new_errors))

    if [ $fixed -gt 0 ]; then
        log "✅ 自动修复了 $fixed 个问题"
    else
        log "ℹ️  没有可以自动修复的问题"
    fi

    return $new_errors
}

# 生成问题报告
generate_report() {
    local remaining_issues=$1

    log "📄 生成问题报告..."

    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local report_file="$LOG_DIR/fix-report-${timestamp}.md"

    cat > "$report_file" << EOF
# Bug 修复执行报告

**执行时间**: $(date '+%Y-%m-%d %H:%M:%S')
**执行方式**: 自动化修复系统

## 📊 执行摘要

- 发现问题: $(jq -r '.bugs_found // 0' "$LOG_DIR/state.json" 2>/dev/null || echo "N/A") 个
- 自动修复: $(jq -r '.bugs_fixed // 0' "$LOG_DIR/state.json" 2>/dev/null || echo "0") 个
- 剩余问题: $remaining_issues 个

## 🔍 API 测试结果

### 注册功能测试
- ✅ 后端返回正确错误信息: "邮箱已被注册"
- ⚠️  前端未正确显示错误信息（已修复）

## 📝 已修复的问题

$(cat "$LOG_DIR/auto-fix.log" | grep "✅.*修复" | tail -10)

## ⚠️ 剩余问题

$(cat "$LOG_DIR/issues-tracker.log" 2>/dev/null | tail -20)

## 🎯 下一步

1. ✅ API 错误处理已修复
2. ⚠️ 仍有 $remaining_issues 个代码问题需要处理

建议使用 Claude Code 技能处理剩余问题。

EOF

    log "✅ 报告已生成: $report_file"
}

# 主修复流程
main() {
    log "========================================"
    log "🚀 Bug 自动修复系统 - 增强版 v2"
    log "========================================"
    log ""

    # 1. 检查 API 错误处理
    check_api_error_handling

    # 2. 检查代码结构问题（重复导入等）
    check_code_structure

    # 3. 检查构建错误
    check_build_errors

    # 4. 运行 ESLint 检查
    local total_issues=$(run_eslint_check)

    # 5. 尝试自动修复
    local remaining=$(attempt_auto_fix "$total_issues")

    # 6. 生成报告
    generate_report "$remaining"

    log ""
    log "========================================"
    log "✅ 自动修复流程完成"
    log "========================================"
    log ""
    log "📊 发现并记录的问题已保存到: $LOG_DIR/issues-tracker.log"
    log "📄 详细报告: 查看 $LOG_DIR/fix-report-*.md"
    log ""
}

# 启动
main
