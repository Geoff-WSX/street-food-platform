#!/bin/bash

# 快速诊断和修复脚本
# 用于快速发现并修复常见问题

PROJECT_DIR="/Users/Zhuanz/street-food-platform"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           🔧 快速诊断和修复工具                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 诊断函数
diagnose() {
    echo -e "${YELLOW}📊 正在诊断项目...${NC}"
    echo "----------------------------------------"

    local issues=0

    # 检查端口占用
    echo -n "检查端口占用... "
    if lsof -ti:3000 >/dev/null 2>&1 || lsof -ti:5176 >/dev/null 2>&1; then
        echo -e "${YELLOW}端口被占用${NC}"
        ((issues++))
    else
        echo -e "${GREEN}正常${NC}"
    fi

    # 检查依赖
    echo -n "检查前端依赖... "
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -e "${RED}缺失${NC}"
        ((issues++))
    else
        echo -e "${GREEN}正常${NC}"
    fi

    echo -n "检查后端依赖... "
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo -e "${RED}缺失${NC}"
        ((issues++))
    else
        echo -e "${GREEN}正常${NC}"
    fi

    # 检查 ESLint
    echo -n "检查代码质量... "
    local lint_output=$(cd "$FRONTEND_DIR" && npm run lint 2>&1 | grep -c "error\|warning" || echo "0")
    if [ "$lint_output" -gt 50 ]; then
        echo -e "${RED}发现 $lint_output 个问题${NC}"
        ((issues++))
    else
        echo -e "${GREEN}发现 $lint_output 个问题${NC}"
    fi

    echo ""
    echo -e "诊断结果: 发现 ${YELLOW}$issues${NC} 个问题"
    echo ""

    return $issues
}

# 快速修复函数
quick_fix() {
    echo -e "${YELLOW}🔧 正在执行快速修复...${NC}"
    echo "----------------------------------------"

    # 修复 1: 清理端口
    echo "1. 清理端口占用..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null && echo -e "  ${GREEN}✅ 端口 3000 已清理${NC}"
    lsof -ti:5176 | xargs kill -9 2>/dev/null && echo -e "  ${GREEN}✅ 端口 5176 已清理${NC}"

    # 修复 2: 安装依赖
    echo ""
    echo "2. 检查并安装依赖..."
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo "  安装前端依赖..."
        cd "$FRONTEND_DIR" && npm install >/dev/null 2>&1 && echo -e "  ${GREEN}✅ 前端依赖已安装${NC}"
    fi

    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo "  安装后端依赖..."
        cd "$BACKEND_DIR" && npm install >/dev/null 2>&1 && echo -e "  ${GREEN}✅ 后端依赖已安装${NC}"
    fi

    # 修复 3: 生成 Prisma Client
    echo ""
    echo "3. 检查 Prisma Client..."
    if [ ! -d "$BACKEND_DIR/node_modules/.prisma" ]; then
        cd "$BACKEND_DIR" && npx prisma generate >/dev/null 2>&1 && echo -e "  ${GREEN}✅ Prisma Client 已生成${NC}"
    else
        echo -e "  ${GREEN}✅ Prisma Client 正常${NC}"
    fi

    # 修复 4: 自动修复 ESLint 问题
    echo ""
    echo "4. 尝试自动修复 ESLint 问题..."
    cd "$FRONTEND_DIR"
    npm run lint -- --fix 2>&1 | grep -E "error|warning" | head -5
    echo -e "  ${GREEN}✅ 自动修复完成${NC}"

    echo ""
    echo -e "${GREEN}✅ 快速修复完成！${NC}"
    echo ""
}

# 启动服务函数
start_services() {
    echo -e "${YELLOW}🚀 正在启动服务...${NC}"
    echo "----------------------------------------"

    # 启动后端
    echo "启动后端..."
    cd "$BACKEND_DIR"
    npm run dev > "$PROJECT_DIR/logs/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "$PROJECT_DIR/.backend.pid"
    echo -e "${GREEN}✅ 后端已启动 (PID: $BACKEND_PID)${NC}"

    # 等待
    sleep 3

    # 启动前端
    echo "启动前端..."
    cd "$FRONTEND_DIR"
    npm run dev > "$PROJECT_DIR/logs/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$PROJECT_DIR/.frontend.pid"
    echo -e "${GREEN}✅ 前端已启动 (PID: $FRONTEND_PID)${NC}"

    echo ""
    echo -e "${GREEN}✅ 所有服务已启动！${NC}"
    echo "后端: http://localhost:3000"
    echo "前端: http://localhost:5176"
    echo ""
}

# 主菜单
show_menu() {
    echo -e "${BLUE}请选择操作:${NC}"
    echo "  1. 诊断项目"
    echo "  2. 快速修复"
    echo "  3. 启动服务"
    echo "  4. 全部执行"
    echo "  5. 退出"
    echo ""
    echo -n "请输入选项 [1-5]: "
}

# 主程序
main() {
    if [ "$1" = "--auto" ]; then
        # 自动模式：执行全部
        diagnose
        if [ $? -gt 0 ]; then
            quick_fix
        fi
        start_services
        echo -e "${GREEN}🎉 完成！项目已启动并运行。${NC}"
    else
        # 交互模式
        while true; do
            show_menu
            read -r choice

            case $choice in
                1)
                    diagnose
                    ;;
                2)
                    quick_fix
                    ;;
                3)
                    start_services
                    ;;
                4)
                    diagnose
                    if [ $? -gt 0 ]; then
                        quick_fix
                    fi
                    start_services
                    echo -e "${GREEN}🎉 全部完成！${NC}"
                    ;;
                5)
                    echo "👋 退出"
                    exit 0
                    ;;
                *)
                    echo -e "${RED}无效选项，请重试${NC}"
                    ;;
            esac

            echo ""
            read -p "按 Enter 继续..."
            clear
        done
    fi
}

# 启动
main "$@"
