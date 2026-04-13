#!/bin/bash

# WebSocket 测试文件验证脚本
# 验证所有测试文件是否正确创建和配置

set -e

echo "🔍 WebSocket 测试文件验证"
echo "=============================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success_count=0
error_count=0

# 函数：检查文件是否存在
check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description"
        echo "   路径: $file"
        ((success_count++))
        return 0
    else
        echo -e "${RED}❌${NC} $description"
        echo "   路径: $file"
        ((error_count++))
        return 1
    fi
}

# 函数：检查目录是否存在
check_dir() {
    local dir=$1
    local description=$2

    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅${NC} $description"
        echo "   路径: $dir"
        ((success_count++))
        return 0
    else
        echo -e "${RED}❌${NC} $description"
        echo "   路径: $dir"
        ((error_count++))
        return 1
    fi
}

echo "📋 后端测试文件"
echo "----------------"

check_file "backend/src/websocket/__tests__/websocket.server.test.ts" "服务器基础功能测试"
check_file "backend/src/websocket/__tests__/websocket.integration.test.ts" "集成测试"
check_file "backend/src/websocket/__tests__/websocket.stress.test.ts" "压力测试"

echo ""
echo "📋 前端测试文件"
echo "----------------"

check_file "frontend/src/services/__tests__/websocket.test.ts" "客户端 WebSocket 服务测试"

echo ""
echo "📋 配置文件"
echo "----------------"

check_file "backend/jest.config.js" "后端 Jest 配置"
check_file "frontend/vitest.config.ts" "前端 Vitest 配置"
check_file "backend/src/__tests__/setup.ts" "后端测试环境设置"
check_file "frontend/src/__tests__/setup.ts" "前端测试环境设置"

echo ""
echo "📋 脚本文件"
echo "----------------"

check_file "scripts/test-websocket.sh" "WebSocket 测试运行脚本"

echo ""
echo "📋 文档文件"
echo "----------------"

check_file "WEBSOCKET_TESTING.md" "测试技术文档"
check_file "WEBSOCKET_TESTS_README.md" "测试使用指南"
check_file "WEBSOCKET_TEST_SUMMARY.md" "测试实施总结"

echo ""
echo "📋 目录结构"
echo "----------------"

check_dir "backend/src/websocket/__tests__" "后端测试目录"
check_dir "frontend/src/services/__tests__" "前端测试目录"

echo ""
echo "📋 测试配置验证"
echo "----------------"

# 检查后端 package.json 是否包含测试脚本
if grep -q '"test:websocket"' backend/package.json; then
    echo -e "${GREEN}✅${NC} 后端测试脚本已配置"
    ((success_count++))
else
    echo -e "${YELLOW}⚠️${NC} 后端测试脚本未在 package.json 中配置"
    ((error_count++))
fi

# 检查前端 package.json 是否包含测试脚本
if grep -q '"test:websocket"' frontend/package.json; then
    echo -e "${GREEN}✅${NC} 前端测试脚本已配置"
    ((success_count++))
else
    echo -e "${YELLOW}⚠️${NC} 前端测试脚本未在 package.json 中配置"
    ((error_count++))
fi

# 检查测试脚本是否可执行
if [ -x "scripts/test-websocket.sh" ]; then
    echo -e "${GREEN}✅${NC} 测试脚本可执行"
    ((success_count++))
else
    echo -e "${YELLOW}⚠️${NC} 测试脚本不可执行"
    ((error_count++))
fi

echo ""
echo "=============================="
echo -e "${GREEN}成功: $success_count${NC} | ${RED}错误: $error_count${NC}"
echo ""

if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}🎉 所有 WebSocket 测试文件验证通过！${NC}"
    echo ""
    echo "下一步："
    echo "1. 运行测试: ./scripts/test-websocket.sh"
    echo "2. 查看文档: cat WEBSOCKET_TESTS_README.md"
    exit 0
else
    echo -e "${RED}⚠️  发现 $error_count 个问题，请检查上述错误${NC}"
    exit 1
fi
