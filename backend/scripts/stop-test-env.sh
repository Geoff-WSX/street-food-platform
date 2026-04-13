#!/bin/bash

# 停止测试环境脚本

set -e

echo "🛑 停止测试环境"
echo "=============="
echo ""

# 停止测试前端
echo "停止测试前端 (端口 5178)..."
FRONTEND_PID=$(lsof -ti:5178 2>/dev/null)
if [ -n "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID
    echo "✅ 测试前端已停止"
else
    echo "✓ 测试前端未运行"
fi

# 停止测试后端
echo "停止测试后端 (端口 3002)..."
BACKEND_PID=$(lsof -ti:3002 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
    kill $BACKEND_PID
    echo "✅ 测试后端已停止"
else
    echo "✓ 测试后端未运行"
fi

# 清理临时文件
echo "清理临时文件..."
rm -f backend/.start-test-backend.sh
rm -f frontend/.start-test-frontend.sh

echo ""
echo "✅ 测试环境已停止"
