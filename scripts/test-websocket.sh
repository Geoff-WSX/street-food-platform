#!/bin/bash

# WebSocket 测试脚本
# 运行所有 WebSocket 相关测试

set -e

echo "🧪 开始运行 WebSocket 测试..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 函数：运行后端 WebSocket 测试
run_backend_tests() {
    echo -e "${YELLOW}📡 运行后端 WebSocket 测试...${NC}"
    cd backend

    # 检查是否安装了测试依赖
    if ! npm list jest > /dev/null 2>&1; then
        echo "安装测试依赖..."
        npm install --save-dev jest @types/jest ts-jest @types/ws
    fi

    # 运行测试
    npm test -- --testPathPattern=websocket --verbose

    cd ..
}

# 函数：运行前端 WebSocket 测试
run_frontend_tests() {
    echo -e "${YELLOW}💻 运行前端 WebSocket 测试...${NC}"
    cd frontend

    # 检查是否安装了测试依赖
    if ! npm list jest > /dev/null 2>&1; then
        echo "安装测试依赖..."
        npm install --save-dev jest @types/jest ts-jest @testing-library/jest-dom
    fi

    # 运行测试
    npm test -- --testPathPattern=websocket --verbose

    cd ..
}

# 函数：运行所有 WebSocket 测试
run_all_tests() {
    echo -e "${GREEN}🚀 运行所有 WebSocket 测试${NC}"
    echo "==================================="
    echo ""

    run_backend_tests
    echo ""
    run_frontend_tests

    echo ""
    echo -e "${GREEN}✅ 所有 WebSocket 测试完成！${NC}"
}

# 主菜单
case "${1:-all}" in
    backend)
        run_backend_tests
        ;;
    frontend)
        run_frontend_tests
        ;;
    all)
        run_all_tests
        ;;
    *)
        echo "用法: $0 [backend|frontend|all]"
        echo "  backend  - 只运行后端 WebSocket 测试"
        echo "  frontend - 只运行前端 WebSocket 测试"
        echo "  all      - 运行所有测试 (默认)"
        exit 1
        ;;
esac
