#!/bin/bash

# 项目启动脚本 - 自动运行健康检查和技能
# 此脚本会：
# 1. 运行健康检查
# 2. 启动后端服务
# 3. 启动前端服务
# 4. 触发 Bug 排查技能

PROJECT_DIR="/Users/Zhuanz/street-food-platform"
cd "$PROJECT_DIR"

echo "========================================"
echo "🚀 街边美食平台 - 启动脚本"
echo "========================================"
echo ""

# 1. 运行健康检查
echo "📋 步骤 1/4: 运行健康检查..."
bash scripts/start-health-check.sh
HEALTH_CHECK=$?

if [ $HEALTH_CHECK -ne 0 ]; then
    echo ""
    echo "⚠️  健康检查发现问题，但继续启动..."
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "========================================"

# 2. 清理现有端口
echo "📋 步骤 2/4: 清理现有端口..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5176 | xargs kill -9 2>/dev/null
echo "✅ 端口清理完成"

echo ""
echo "========================================"

# 3. 启动服务
echo "📋 步骤 3/4: 启动服务..."
echo ""

# 启动后端
echo "🔧 启动后端服务..."
cd "$PROJECT_DIR/backend"
npm run dev > "$PROJECT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "✅ 后端启动 (PID: $BACKEND_PID)"
echo "   地址: http://localhost:3000"

# 等待后端启动
sleep 3

# 启动前端
echo ""
echo "🎨 启动前端服务..."
cd "$PROJECT_DIR/frontend"
npm run dev > "$PROJECT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "✅ 前端启动 (PID: $FRONTEND_PID)"
echo "   地址: http://localhost:5176"

echo ""
echo "========================================"

# 4. 等待服务稳定后触发 Bug 排查
echo "📋 步骤 4/4: 等待服务稳定..."
sleep 5

echo ""
echo "========================================"
echo "✅ 项目启动完成！"
echo "========================================"
echo "后端: http://localhost:3000 (PID: $BACKEND_PID)"
echo "前端: http://localhost:5176 (PID: $FRONTEND_PID)"
echo ""
echo "日志文件:"
echo "  - 后端: $PROJECT_DIR/logs/backend.log"
echo "  - 前端: $PROJECT_DIR/logs/frontend.log"
echo ""
echo "停止服务:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  或运行: ./scripts/stop.sh"
echo "========================================"
echo ""
echo "💡 提示: 现在可以运行 Bug 排查技能"
echo "   在 Claude Code 中输入: 使用 bug-detection 技能进行全面排查"
echo ""

# 保存 PID 到文件
echo "$BACKEND_PID" > "$PROJECT_DIR/.backend.pid"
echo "$FRONTEND_PID" > "$PROJECT_DIR/.frontend.pid"

# 5. 启动自动化 Bug 修复循环系统
echo ""
echo "========================================"
echo "📋 步骤 5/5: 启动自动化 Bug 修复循环系统..."
echo ""

# 启动自动化循环系统
bash "$PROJECT_DIR/scripts/auto-fix-loop.sh" > "$PROJECT_DIR/logs/auto-fix-loop.log" 2>&1 &
AUTO_FIX_PID=$!
echo "✅ 自动化 Bug 修复循环系统已启动 (PID: $AUTO_FIX_PID)"
echo "   日志: $PROJECT_DIR/logs/auto-fix/auto-fix.log"
echo ""
echo "🔄 系统将自动："
echo "   1. 每 60 秒检查一次代码问题"
echo "   2. 发现问题自动分析并规划修复方案"
echo "   3. 执行修复并验证结果"
echo "   4. 持续循环直到项目停止"
echo ""
echo "💡 查看自动化日志:"
echo "   tail -f $PROJECT_DIR/logs/auto-fix/auto-fix.log"
echo ""

# 保存自动化系统 PID
echo "$AUTO_FIX_PID" > "$PROJECT_DIR/.auto-fix.pid"

echo "========================================"
echo "🎉 所有系统启动完成！"
echo "========================================"
echo "后端服务:     http://localhost:3000 (PID: $BACKEND_PID)"
echo "前端服务:     http://localhost:5176 (PID: $FRONTEND_PID)"
echo "自动化修复:   运行中 (PID: $AUTO_FIX_PID)"
echo ""
echo "停止所有服务:"
echo "  ./scripts/stop.sh"
echo "========================================"
echo ""
