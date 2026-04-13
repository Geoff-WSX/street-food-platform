#!/bin/bash

# Web项目测试运行脚本
set -e

echo "🧪 Web项目测试运行"
echo "=================="

# 清理端口
echo "清理测试端口..."
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# 设置环境
export NODE_ENV=test
export DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test"
export PORT=3002

# 运行测试
echo "运行测试..."
npm test
