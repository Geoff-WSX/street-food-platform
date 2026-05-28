#!/bin/bash
#
# 街头美食平台 - 阿里云部署脚本
# 适用于 Ubuntu 22.04 LTS
#

set -e

echo "=========================================="
echo "街头美食平台 - 阿里云一键部署脚本"
echo "=========================================="

# 配置变量
PROJECT_DIR="/var/www/street-food-platform"
NODE_VERSION="18"
DOMAIN="your-domain.com"  # 替换为你的域名

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
    log_error "请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 更新系统
log_info "更新系统包..."
apt update && apt upgrade -y

# 2. 安装 Node.js 18
log_info "安装 Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
apt install -y nodejs
node -v
npm -v

# 3. 安装 PM2
log_info "安装 PM2 进程管理器..."
npm install -g pm2
pm2 version

# 4. 安装 Nginx
log_info "安装 Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# 5. 安装 PostgreSQL 客户端（用于数据库迁移）
log_info "安装 PostgreSQL 客户端..."
apt install -y postgresql-client

# 6. 创建项目目录
log_info "创建项目目录..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 7. Clone 代码（如果是首次部署）
if [ ! -d ".git" ]; then
    log_info "Clone 代码仓库..."
    git clone https://github.com/Geoff-WSX/street-food-platform.git .
else
    log_info "更新代码..."
    git pull origin main
fi

# 8. 创建后端目录软链接
ln -sfn $PROJECT_DIR/backend /var/www/street-food-backend

# 9. 安装后端依赖
log_info "安装后端依赖..."
cd $PROJECT_DIR/backend
npm install

# 10. 生成 Prisma 客户端
log_info "生成 Prisma 客户端..."
npx prisma generate

# 11. 编译 TypeScript
log_info "编译 TypeScript..."
npm run build

# 12. 创建环境变量文件
log_info "创建环境变量配置..."
cat > $PROJECT_DIR/backend/.env << 'EOF'
# 数据库（Neon PostgreSQL）
DATABASE_URL="postgresql://neondb_owner:npg_xxxxxxxx@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:npg_xxxxxxx@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# CORS（替换为你的域名）
CORS_ALLOWED_ORIGINS="http://localhost:5176,https://your-frontend.vercel.app,https://your-domain.com"

# 七牛云存储
QINIU_ACCESS_KEY="your-qiniu-access-key"
QINIU_SECRET_KEY="your-qiniu-secret-key"
QINIU_BUCKET="jiebian"
QINIU_DOMAIN="http://teyujjlpa.hn-bkt.clouddn.com"

# 环境
NODE_ENV="production"
PORT=3000
EOF

log_warn "请编辑 $PROJECT_DIR/backend/.env 配置正确的环境变量！"

# 13. 配置 PM2
log_info "配置 PM2..."
cat > $PROJECT_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'street-food-api',
    script: 'dist/server.js',
    cwd: '/var/www/street-food-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/street-food-api-error.log',
    out_file: '/var/log/pm2/street-food-api-out.log',
    log_file: '/var/log/pm2/street-food-api.log',
    time: true
  }]
};
EOF

# 创建日志目录
mkdir -p /var/log/pm2

# 14. 启动服务
log_info "启动服务..."
pm2 start $PROJECT_DIR/ecosystem.config.js
pm2 save

# 15. 配置 PM2 开机自启
log_info "配置开机自启..."
pm2 startup

# 16. 配置防火墙
log_info "配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable

# 17. 配置 Nginx 反向代理
log_info "配置 Nginx 反向代理..."
cat > /etc/nginx/sites-available/street-food-api << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或服务器IP

    # SSL 配置（后续用 certbot 自动生成）
    # listen 443 ssl http2;
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API 请求日志
    access_log /var/log/nginx/street-food-api-access.log;
    error_log /var/log/nginx/street-food-api-error.log;
}
EOF

# 启用站点
ln -sfn /etc/nginx/sites-available/street-food-api /etc/nginx/sites-enabled/

# 测试 Nginx 配置
nginx -t

# 重载 Nginx
systemctl reload nginx

echo ""
echo "=========================================="
log_info "后端部署完成！"
echo "=========================================="
echo ""
echo "后续步骤："
echo "1. 编辑 .env 配置数据库和七牛云凭证"
echo "   nano $PROJECT_DIR/backend/.env"
echo ""
echo "2. 重启服务使配置生效"
echo "   pm2 restart street-food-api"
echo ""
echo "3. 配置 SSL（可选但强烈推荐）"
echo "   apt install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d your-domain.com"
echo ""
echo "4. 查看服务状态"
echo "   pm2 status"
echo "   pm2 logs street-food-api"
echo ""
echo "=========================================="
