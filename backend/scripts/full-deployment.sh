#!/bin/bash

# 完整的测试→生产部署流程
# 集成所有步骤的一键部署脚本

set -e

echo "🚀 Web项目完整部署流程"
echo "======================="
echo "开始时间: $(date)"
echo ""

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# 步骤1: 运行测试
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第1步: 运行测试套件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "是否运行测试？(Y/n): " -r
echo

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    warning "清理测试环境..."
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true

    warning "运行测试..."
    export NODE_ENV=test
    export DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test"
    export PORT=3002

    if npm test -- --coverage --coveragePath="./coverage/coverage-final.json" 2>&1 | tee ./logs/test_output.log; then
        success "测试通过"
    else
        error "测试失败"
        echo "查看日志: ./logs/test_output.log"
        read -p "是否继续部署？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    warning "跳过测试"
fi

# 步骤2: 同步Schema到测试环境
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第2步: 同步Schema到测试环境"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_test" \
    npx prisma db push --schema=./prisma/schema.prisma

success "测试环境Schema已同步"

# 步骤3: 生产环境准备
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第3步: 生产环境准备"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 备份
BACKUP_FILE="./backups/street_food_web_prod_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p ./backups

warning "备份生产环境..."
mysqldump -u root -proot123456 street_food_web_prod > $BACKUP_FILE 2>&1 | grep -v "Warning"
success "备份完成: $BACKUP_FILE"

# 步骤4: 同步Schema到生产环境
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第4步: 同步Schema到生产环境"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

warning "即将更新生产环境Schema！"
read -p "确认继续？(y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "取消部署"
    exit 1
fi

DATABASE_URL="mysql://root:root123456@localhost:3306/street_food_web_prod" \
    npx prisma db push --schema=./prisma/schema.prisma

success "生产环境Schema已更新"

# 步骤5: 验证生产环境
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第5步: 验证生产环境"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "检查数据库连接..."
if mysql -u root -proot123456 street_food_web_prod -e "SELECT 1" > /dev/null 2>&1; then
    success "数据库连接正常"
else
    error "数据库连接失败"

    read -p "是否回滚？(Y/n): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        warning "执行回滚..."
        mysql -u root -proot123456 street_food_web_prod < $BACKUP_FILE
        success "已回滚到备份"
        exit 1
    fi
fi

# 步骤6: 应用服务
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "第6步: 应用服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

warning "请重启应用服务:"
echo ""
echo "  pm2 restart street-food-web"
echo ""
echo "或使用:"
echo "  pm2 start ecosystem.config.js"
echo ""

read -p "应用已重启？(y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warning "请手动重启应用服务"
fi

# 完成
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "部署完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📊 部署摘要:"
echo "  备份文件: $BACKUP_FILE"
echo "  部署时间: $(date)"
echo ""

success "部署成功！"

echo ""
echo "📋 后续监控:"
echo "  1. 检查应用日志: pm2 logs street-food-web"
echo "  2. 监控错误日志: tail -f ./logs/error.log"
echo "  3. 验证关键功能"
echo "  4. 观察性能指标"
echo ""

# 保存部署记录
echo "" >> ./logs/deployments.log
echo "========================================" >> ./logs/deployments.log
echo "部署时间: $(date)" >> ./logs/deployments.log
echo "备份文件: $BACKUP_FILE" >> ./logs/deployments.log
echo "状态: 成功" >> ./logs/deployments.log
