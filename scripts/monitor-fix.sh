#!/bin/bash

# Bug 修复自动化系统监控脚本
# 实时显示自动化系统的运行状态

PROJECT_DIR="/Users/Zhuanz/street-food-platform"
LOG_DIR="$PROJECT_DIR/logs/auto-fix"
STATE_FILE="$LOG_DIR/state.json"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 清屏并显示标题
show_header() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        🤖 Bug 修复自动化系统 - 实时监控面板              ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 显示系统状态
show_status() {
    echo -e "${YELLOW}📊 系统状态${NC}"
    echo "----------------------------------------"

    # 检查 PID 文件
    if [ -f "$PROJECT_DIR/.auto-fix.pid" ]; then
        PID=$(cat "$PROJECT_DIR/.auto-fix.pid")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "  状态: ${GREEN}✅ 运行中${NC} (PID: $PID)"
        else
            echo -e "  状态: ${RED}❌ 已停止${NC} (PID 文件存在但进程不存在)"
        fi
    else
        echo -e "  状态: ${YELLOW}⚠️  未启动${NC}"
    fi

    # 检查服务状态
    echo ""
    echo "  服务状态:"
    if lsof -ti:3000 >/dev/null 2>&1; then
        echo -e "    后端 (3000): ${GREEN}✅ 运行中${NC}"
    else
        echo -e "    后端 (3000): ${RED}❌ 未运行${NC}"
    fi

    if lsof -ti:5176 >/dev/null 2>&1; then
        echo -e "    前端 (5176): ${GREEN}✅ 运行中${NC}"
    else
        echo -e "    前端 (5176): ${RED}❌ 未运行${NC}"
    fi

    echo ""
}

# 显示统计数据
show_stats() {
    echo -e "${YELLOW}📈 修复统计${NC}"
    echo "----------------------------------------"

    if [ -f "$STATE_FILE" ] && command -v jq >/dev/null 2>&1; then
        local cycle_count=$(jq -r '.cycle_count // 0' "$STATE_FILE")
        local bugs_fixed=$(jq -r '.bugs_fixed // 0' "$STATE_FILE")
        local bugs_verified=$(jq -r '.bugs_verified // 0' "$STATE_FILE")
        local last_check=$(jq -r '.last_check // "从未"' "$STATE_FILE")

        echo "  循环次数: $cycle_count"
        echo "  已修复: $bugs_fixed 个问题"
        echo "  已验证: $bugs_verified 个修复"
        echo "  上次检查: $last_check"
    else
        echo "  (暂无统计数据)"
    fi

    echo ""
}

# 显示最新日志
show_logs() {
    echo -e "${YELLOW}📝 最新日志 (最后 10 行)${NC}"
    echo "----------------------------------------"

    if [ -f "$LOG_DIR/auto-fix.log" ]; then
        tail -10 "$LOG_DIR/auto-fix.log"
    else
        echo "  (暂无日志)"
    fi

    echo ""
}

# 显示最近的问题
show_recent_issues() {
    echo -e "${YELLOW}🐛 最近发现的问题${NC}"
    echo "----------------------------------------"

    # 查找最新的排查报告
    local latest_report=$(ls -t "$PROJECT_DIR/logs/bug-detection-report-"*.md 2>/dev/null | head -1)

    if [ -n "$latest_report" ]; then
        echo "  报告: $(basename "$latest_report")"
        echo ""

        # 提取 P0 和 P1 问题
        if grep -q "P0" "$latest_report"; then
            echo -e "  ${RED}P0 紧急问题:${NC}"
            grep -A 2 "###.*P0" "$latest_report" | head -10 | sed 's/^/    /'
        fi

        if grep -q "P1" "$latest_report"; then
            echo -e "  ${YELLOW}P1 重要问题:${NC}"
            grep -A 2 "###.*P1" "$latest_report" | head -10 | sed 's/^/    /'
        fi
    else
        echo "  (暂无问题报告)"
    fi

    echo ""
}

# 显示操作提示
show_commands() {
    echo -e "${BLUE}🎮 操作命令${NC}"
    echo "----------------------------------------"
    echo "  [Q] 退出监控"
    echo "  [R] 手动触发 Bug 排查"
    echo "  [L] 查看完整日志"
    echo "  [S] 查看状态文件"
    echo ""
}

# 主循环
main() {
    # 初始化
    local refresh_interval=5
    local key=''

    # 隐藏光标
    tput civis 2>/dev/null

    # 主循环
    while true; do
        show_header
        show_status
        show_stats
        show_logs
        show_recent_issues
        show_commands

        echo -e "${BLUE}按 Q 退出，或等待 ${refresh_interval} 秒刷新...${NC}"

        # 读取输入（带超时）
        if read -t $refresh_interval -n 1 key 2>/dev/null; then
            case $key in
                q|Q)
                    echo ""
                    echo "👋 退出监控"
                    tput cnorm 2>/dev/null
                    exit 0
                    ;;
                r|R)
                    echo ""
                    echo "🔍 触发 Bug 排查..."
                    echo "RUN_DETECTION" > "$LOG_DIR/trigger"
                    sleep 2
                    ;;
                l|L)
                    echo ""
                    echo "📄 打开完整日志..."
                    if [ -f "$LOG_DIR/auto-fix.log" ]; then
                        less "$LOG_DIR/auto-fix.log"
                    fi
                    ;;
                s|S)
                    echo ""
                    echo "📊 状态文件内容:"
                    if [ -f "$STATE_FILE" ]; then
                        cat "$STATE_FILE"
                    fi
                    echo ""
                    read -p "按 Enter 继续..."
                    ;;
            esac
        fi
    done
}

# 恢复光标
trap 'tput cnorm 2>/dev/null; echo' EXIT

# 启动
main
