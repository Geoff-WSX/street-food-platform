#!/bin/bash

# Bug 修复自动化循环系统 - 真实执行版本
# 直接运行 ESLint 自动修复，并记录问题

PROJECT_DIR="/Users/Zhuanz/street-food-platform"
LOG_DIR="$PROJECT_DIR/logs/auto-fix"
PID_FILE="$PROJECT_DIR/.auto-fix.pid"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/auto-fix.log"
}

# 信号处理
cleanup() {
    log "🛑 收到停止信号，正在优雅退出..."
    log "📋 保存当前状态..."
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 系统停止" >> "$LOG_DIR/status.log"
    rm -f "$PID_FILE"
    log "✅ 自动化循环系统已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

log "🚀 启动 Bug 修复自动化循环系统"
log "========================================"

# 保存 PID
echo $$ > "$PID_FILE"
log "📝 进程 PID: $$"

# 系统状态
STATE_FILE="$LOG_DIR/state.json"

# 初始化状态
init_state() {
    cat > "$STATE_FILE" << EOF
{
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "last_check": null,
  "last_fix": null,
  "cycle_count": 0,
  "bugs_found": 0,
  "bugs_fixed": 0,
  "auto_fixable": 0,
  "status": "running"
}
EOF
    log "✅ 状态文件初始化完成"
}

# 运行 Bug 排查（ESLint）
run_bug_detection() {
    log "🔍 步骤 1: 运行 Bug 排查..."

    cd "$PROJECT_DIR/frontend"

    # 运行 ESLint 并保存结果
    npm run lint 2>&1 | tee "$LOG_DIR/lint-output.log" | tee -a "$LOG_DIR/auto-fix.log"

    # 统计问题数量
    local errors=$(grep -c "error" "$LOG_DIR/lint-output.log" 2>/dev/null || echo "0")
    local warnings=$(grep -c "warning" "$LOG_DIR/lint-output.log" 2>/dev/null || echo "0")
    local total=$((errors + warnings))

    log "📊 排查结果: 发现 $errors 个错误，$warnings 个警告，总计 $total 个问题"

    # 保存到状态
    if command -v jq &> /dev/null; then
        jq ".bugs_found = $total" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
    fi

    # 生成排查报告
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local report_file="$LOG_DIR/detection-${timestamp}.md"

    cat > "$report_file" << EOF
# Bug 排查报告

**排查时间**: $(date '+%Y-%m-%d %H:%M:%S')
**排查方式**: ESLint 自动检查

## 问题统计
- 错误: $errors 个
- 警告: $warnings 个
- 总计: $total 个

## 详细问题
$(grep -E "error|warning" "$LOG_DIR/lint-output.log" | head -50)

## 可自动修复的问题
$(grep -c "error\|warning" "$LOG_DIR/lint-output.log" | awk '{print "总计约 " $1 " 个问题可能可以自动修复"}')

EOF

    log "✅ Bug 排查完成: $report_file"

    # 复制到最新报告
    cp "$report_file" "$PROJECT_DIR/logs/bug-detection-report-latest.md" 2>/dev/null

    echo "$total"
}

# 分析问题
analyze_issues() {
    local total_issues=$1
    log "📊 步骤 2: 分析问题..."

    if [ "$total_issues" -eq 0 ]; then
        log "✅ 无问题需要处理"
        return 1
    fi

    # 检查哪些问题可以自动修复
    cd "$PROJECT_DIR/frontend"

    # 尝试自动修复
    log "🔧 尝试自动修复..."
    npm run lint -- --fix 2>&1 | tee -a "$LOG_DIR/auto-fix.log" | grep -E "fixable|Fixed" | head -10

    # 再次检查
    local new_errors=$(npm run lint 2>&1 | grep -c "error" 2>/dev/null || echo "0")
    local fixed=$((total_issues - new_errors))

    if [ $fixed -gt 0 ]; then
        log "✅ 自动修复了 $fixed 个问题"

        if command -v jq &> /dev/null; then
            jq ".bugs_fixed += $fixed" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
            jq ".auto_fixable = $fixed" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
        fi
    else
        log "ℹ️  没有可以自动修复的问题"
    fi

    return 0
}

# 记录剩余问题
record_remaining_issues() {
    log "📋 步骤 3: 记录剩余问题..."

    cd "$PROJECT_DIR/frontend"
    local remaining=$(npm run lint 2>&1 | grep -c "error\|warning" 2>/dev/null || echo "0")

    if [ "$remaining" -gt 0 ]; then
        log "⚠️  仍有 $remaining 个问题需要人工处理"

        # 分类记录问题
        echo "remaining_issues: $remaining" >> "$LOG_DIR/issues.log"

        # 记录问题详情
        npm run lint 2>&1 | grep -E "error|warning" | head -20 > "$LOG_DIR/remaining-issues.log"

        log "📄 问题详情已保存到: $LOG_DIR/remaining-issues.log"
    else
        log "🎉 所有问题已解决！"
    fi
}

# 生成修复报告
generate_fix_report() {
    log "📄 生成修复报告..."

    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local report_file="$LOG_DIR/fix-report-${timestamp}.md"

    cat > "$report_file" << EOF
# Bug 修复执行报告

**执行时间**: $(date '+%Y-%m-%d %H:%M:%S')
**执行方式**: 自动化循环系统

## 执行摘要

$(if [ -f "$STATE_FILE" ]; then
    echo "- 发现问题: $(jq -r '.bugs_found // 0' "$STATE_FILE") 个"
    echo "- 自动修复: $(jq -r '.bugs_fixed // 0' "$STATE_FILE") 个"
    echo "- 剩余问题: $(npm run lint 2>&1 | grep -c "error\|warning" 2>/dev/null || echo "0") 个"
else
    echo "- 状态: 运行中"
fi)

## 自动修复的问题

$(grep "Fixed\|fixable" "$LOG_DIR/auto-fix.log" | tail -20)

## 剩余问题

$(cat "$LOG_DIR/remaining-issues.log" 2>/dev/null || echo "无")

## 下一步

$(if [ $(npm run lint 2>&1 | grep -c "error\|warning" 2>/dev/null || echo "0") -gt 0 ]; then
    echo "- 人工处理剩余问题"
    echo "- 使用 bug-fix-planner 规划修复方案"
    echo "- 使用 bug-fix-agent 执行修复"
else
    echo "- ✅ 所有问题已解决"
fi)

EOF

    log "✅ 修复报告已生成: $report_file"
}

# 主循环
main_loop() {
    local cycle_count=0

    log "🔄 开始主循环..."
    log "========================================"

    while true; do
        cycle_count=$((cycle_count + 1))
        log ""
        log "🔄 循环 #$cycle_count - $(date '+%Y-%m-%d %H:%M:%S')"
        log "----------------------------------------"

        # 检查项目是否还在运行
        if ! lsof -ti:3000 >/dev/null 2>&1 && ! lsof -ti:5176 >/dev/null 2>&1; then
            log "⚠️  项目服务已停止，退出循环"
            break
        fi

        # 执行修复闭环
        local total_issues=$(run_bug_detection)

        if [ "$total_issues" -gt 0 ]; then
            analyze_issues "$total_issues"
            record_remaining_issues
            generate_fix_report
        fi

        # 更新状态
        if command -v jq &> /dev/null; then
            jq ".last_check = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
            jq ".cycle_count = $cycle_count" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
        fi

        log "----------------------------------------"
        log "⏰ 等待 60 秒后进行下一次检查..."
        log "========================================"

        # 等待一段时间再进行下一次检查
        sleep 60 &
        wait $!
    done
}

# 主程序
main() {
    log "🎯 自动化 Bug 修复循环系统"
    log "========================================"
    log "项目目录: $PROJECT_DIR"
    log "日志目录: $LOG_DIR"
    log "PID 文件: $PID_FILE"
    log ""
    log "📋 系统功能:"
    log "  1. 每 60 秒运行 ESLint 检查"
    log "  2. 自动修复可修复的问题"
    log "  3. 记录剩余问题"
    log "  4. 生成修复报告"
    log ""
    log "💡 提示: 对于无法自动修复的问题，请在 Claude Code 中使用技能:"
    log "   - 使用 bug-analysis 分析问题"
    log "   - 使用 bug-fix-planner 规划方案"
    log "   - 使用 bug-fix-agent 执行修复"
    log "========================================"
    log ""

    # 初始化状态
    init_state

    # 启动主循环
    main_loop

    # 清理
    cleanup
}

# 启动
main
