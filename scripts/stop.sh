#!/bin/bash

# 项目停止脚本

PROJECT_DIR="/Users/Zhuanz/street-food-platform"
cd "$PROJECT_DIR"

echo "========================================"
echo "🛑 停止街边美食平台"
echo "========================================"
echo ""

# 从 PID 文件读取并停止
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "✅ 后端已停止 (PID: $BACKEND_PID)"
    rm .backend.pid
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "✅ 前端已停止 (PID: $FRONTEND_PID)"
    rm .frontend.pid
fi

# 停止自动化 Bug 修复循环系统
if [ -f ".auto-fix.pid" ]; then
    AUTO_FIX_PID=$(cat .auto-fix.pid)
    kill $AUTO_FIX_PID 2>/dev/null && echo "✅ 自动化修复系统已停止 (PID: $AUTO_FIX_PID)"
    rm .auto-fix.pid
fi

# 强制清理端口
echo ""
echo "🧹 清理端口..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5176 | xargs kill -9 2>/dev/null

echo ""
echo "✅ 所有服务已停止"
