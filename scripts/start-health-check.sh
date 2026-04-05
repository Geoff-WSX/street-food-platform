#!/bin/bash

# 项目启动健康检查脚本
# 在项目启动时自动运行各项检查

PROJECT_DIR="/Users/Zhuanz/street-food-platform"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/startup-check-$TIMESTAMP.log"

# 创建日志目录
mkdir -p "$LOG_DIR"

echo "========================================"
echo "🚀 项目启动健康检查"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# 函数：记录日志
log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 函数：检查端口是否占用
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log "⚠️  警告: 端口 $port ($service) 已被占用"
        return 1
    else
        log "✅ 端口 $port ($service) 可用"
        return 0
    fi
}

# 函数：检查依赖
check_dependencies() {
    log "📦 检查依赖..."

    # 检查 Node.js
    if command -v node &> /dev/null; then
        log "✅ Node.js 版本: $(node -v)"
    else
        log "❌ Node.js 未安装"
        return 1
    fi

    # 检查 npm
    if command -v npm &> /dev/null; then
        log "✅ npm 版本: $(npm -v)"
    else
        log "❌ npm 未安装"
        return 1
    fi

    return 0
}

# 函数：检查后端
check_backend() {
    log ""
    log "🔧 检查后端服务..."

    cd "$PROJECT_DIR/backend"

    # 检查 node_modules
    if [ ! -d "node_modules" ]; then
        log "⚠️  后端依赖未安装，正在安装..."
        npm install >> "$LOG_FILE" 2>&1
        if [ $? -eq 0 ]; then
            log "✅ 后端依赖安装成功"
        else
            log "❌ 后端依赖安装失败"
            return 1
        fi
    else
        log "✅ 后端依赖已安装"
    fi

    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        log "⚠️  后端 .env 文件不存在"
    else
        log "✅ 后端 .env 文件存在"
    fi

    # 检查端口
    check_port 3000 "后端"

    return 0
}

# 函数：检查前端
check_frontend() {
    log ""
    log "🎨 检查前端服务..."

    cd "$PROJECT_DIR/frontend"

    # 检查 node_modules
    if [ ! -d "node_modules" ]; then
        log "⚠️  前端依赖未安装，正在安装..."
        npm install >> "$LOG_FILE" 2>&1
        if [ $? -eq 0 ]; then
            log "✅ 前端依赖安装成功"
        else
            log "❌ 前端依赖安装失败"
            return 1
        fi
    else
        log "✅ 前端依赖已安装"
    fi

    # 检查端口
    check_port 5176 "前端"

    return 0
}

# 函数：数据库检查
check_database() {
    log ""
    log "🗄️  检查数据库..."

    cd "$PROJECT_DIR/backend"

    # 检查 Prisma 是否生成
    if [ ! -d "node_modules/.prisma" ]; then
        log "⚠️  Prisma Client 未生成，正在生成..."
        npm run prisma:generate >> "$LOG_FILE" 2>&1
        if [ $? -eq 0 ]; then
            log "✅ Prisma Client 生成成功"
        else
            log "❌ Prisma Client 生成失败"
            return 1
        fi
    else
        log "✅ Prisma Client 已生成"
    fi

    return 0
}

# 函数：代码质量检查
check_code_quality() {
    log ""
    log "🔍 代码质量快速检查..."

    # 检查 TypeScript 编译
    cd "$PROJECT_DIR/frontend"
    log "检查前端 TypeScript..."
    if npm run lint >> "$LOG_FILE" 2>&1; then
        log "✅ 前端 ESLint 检查通过"
    else
        log "⚠️  前端 ESLint 检查发现问题"
    fi

    return 0
}

# 函数：生成检查报告
generate_report() {
    log ""
    log "========================================"
    log "📋 启动检查报告"
    log "========================================"
    log "日志文件: $LOG_FILE"
    log "状态: 完成"
    log "========================================"
}

# 主流程
main() {
    local failed=0

    check_dependencies || failed=$((failed + 1))
    check_backend || failed=$((failed + 1))
    check_frontend || failed=$((failed + 1))
    check_database || failed=$((failed + 1))
    check_code_quality || failed=$((failed + 1))

    generate_report

    if [ $failed -eq 0 ]; then
        log ""
        log "✅ 所有检查通过，准备启动服务..."
        return 0
    else
        log ""
        log "⚠️  发现 $failed 个问题，请查看日志"
        return 1
    fi
}

# 执行主流程
main
exit $?
