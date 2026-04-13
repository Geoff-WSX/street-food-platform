#!/bin/bash

# 生产环境更新流程
# 测试环境验证 → 生产环境更新 → 回滚机制

set -e

# 配置
TEST_DB="street_food_web_test"
PROD_DB="street_food_web_prod"
MYSQL_USER="root"
MYSQL_PASS="root123456"
BACKUP_DIR="./backups"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "\n${GREEN}▶ $1${NC}"
    echo "========================================"
}

print_warning() {
    echo -e "\n${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "\n${RED}❌ $1${NC}"
}

# 创建日志
LOG_FILE="./logs/deployment_$(date +%Y%m%d_%H%M%S).log"
mkdir -p ./logs ./backups

echo "🚀 Web项目生产环境更新流程" | tee $LOG_FILE
echo "开始时间: $(date)" | tee -a $LOG_FILE

# 第一步: 环境检查
print_step "第一步: 环境检查"

echo "检查数据库连接..."
if ! mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SELECT 1" > /dev/null 2>&1; then
    print_error "数据库连接失败"
    exit 1
fi
echo "✅ 数据库连接正常"

echo "检查备份目录..."
mkdir -p $BACKUP_DIR
echo "✅ 备份目录已准备"

# 第二步: 备份生产环境
print_step "第二步: 备份生产环境"

BACKUP_FILE="$BACKUP_DIR/${PROD_DB}_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "备份数据库: $PROD_DB"
if mysqldump -u $MYSQL_USER -p$MYSQL_PASS \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    $PROD_DB > $BACKUP_FILE 2>&1 | tee -a $LOG_FILE; then
    echo "✅ 备份成功: $BACKUP_FILE"
else
    print_error "备份失败"
    exit 1
fi

# 第三步: 测试环境更新
print_step "第三步: 测试环境更新"

echo "更新测试环境Schema..."
DATABASE_URL="mysql://$MYSQL_USER:$MYSQL_PASS@localhost:3306/$TEST_DB" \
    npx prisma db push --schema=./prisma/schema.prisma 2>&1 | tee -a $LOG_FILE

echo "✅ 测试环境Schema已更新"

# 第四步: 运行测试
print_step "第四步: 运行测试验证"

print_warning "是否跳过测试？(不推荐)"
read -p "跳过测试？(y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "运行测试套件..."

    # 清理测试端口
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true

    # 设置测试环境
    export NODE_ENV=test
    export DATABASE_URL="mysql://$MYSQL_USER:$MYSQL_PASS@localhost:3306/$TEST_DB"

    if npm test 2>&1 | tee -a $LOG_FILE; then
        echo "✅ 测试通过"
    else
        print_error "测试失败"
        echo ""
        echo "选择:"
        echo "1. 回滚并退出"
        echo "2. 忽略测试失败继续（危险）"
        read -p "请选择 (1/2): " -r

        if [ "$REPLY" != "2" ]; then
            echo "❌ 取消部署"
            exit 1
        fi
    fi
fi

# 第五步: 生产环境更新
print_step "第五步: 生产环境更新"

print_warning "即将更新生产环境！"
echo "备份文件: $BACKUP_FILE"
echo ""
read -p "确认继续？(y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消部署"
    exit 0
fi

echo "更新生产环境Schema..."
DATABASE_URL="mysql://$MYSQL_USER:$MYSQL_PASS@localhost:3306/$PROD_DB" \
    npx prisma db push --schema=./prisma/schema.prisma 2>&1 | tee -a $LOG_FILE

echo "✅ 生产环境Schema已更新"

# 第六步: 验证生产环境
print_step "第六步: 验证生产环境"

echo "检查数据库连接..."
if mysql -u $MYSQL_USER -p$MYSQL_PASS $PROD_DB -e "SELECT COUNT(*) as user_count FROM users" > /dev/null 2>&1; then
    echo "✅ 数据库可访问"
else
    print_error "数据库验证失败"

    # 询问是否回滚
    read -p "是否回滚？(Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        bash ./scripts/rollback.sh $BACKUP_FILE
        exit 1
    fi
fi

# 第七步: 应用重启提示
print_step "第七步: 应用服务"

print_warning "需要重启应用服务"
echo "请执行以下命令:"
echo ""
echo "  # 停止当前服务"
echo "  pm2 stop street-food-web"
echo ""
echo "  # 更新环境配置"
echo "  cp .env.production .env"
echo ""
echo "  # 启动服务"
echo "  pm2 start street-food-web"
echo ""

read -p "应用已重启？(y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  请手动重启应用服务"
fi

# 完成
print_step "部署完成"

echo "📊 部署摘要:"
echo "  测试环境: $TEST_DB"
echo "  生产环境: $PROD_DB"
echo "  备份文件: $BACKUP_FILE"
echo "  日志文件: $LOG_FILE"
echo ""
echo "结束时间: $(date)" | tee -a $LOG_FILE

# 保存部署记录
echo "" >> ./logs/deployments.log
echo "========================================" >> ./logs/deployments.log
echo "部署时间: $(date)" >> ./logs/deployments.log
echo "备份文件: $BACKUP_FILE" >> ./logs/deployments.log
echo "状态: 成功" >> ./logs/deployments.log

echo ""
echo "🎉 部署成功！"
echo ""
echo "📋 后续监控:"
echo "1. 检查应用日志"
echo "2. 监控错误率"
echo "3. 验证关键功能"
echo "4. 观察性能指标"
