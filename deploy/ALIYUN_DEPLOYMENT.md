# 阿里云部署指南

## 服务器要求

- **推荐配置**: 2核2G + 50GB SSD（轻量应用服务器）
- **系统**: Ubuntu 22.04 LTS
- **节点**: 香港节点（免备案）

---

## 第一步：购买阿里云服务器

1. 访问 [阿里云官网](https://www.aliyun.com)
2. 购买「轻量应用服务器」或「ECS 云服务器」
3. 选择：
   - **地域**: 香港（免备案）
   - **镜像**: Ubuntu 22.04 LTS
   - **配置**: 2核2G 起
4. 设置 root 密码并保存 IP 地址

---

## 第二步：SSH 连接服务器

```bash
ssh root@你的服务器IP
```

---

## 第三步：运行后端部署脚本

```bash
# 在服务器上执行（复制下面这一整行）
curl -fsSL https://raw.githubusercontent.com/Geoff-WSX/street-food-platform/main/deploy/deploy-backend.sh | bash

# 或者手动下载脚本后执行
chmod +x deploy-backend.sh
sudo ./deploy-backend.sh
```

---

## 第四步：配置环境变量

```bash
nano /var/www/street-food-platform/backend/.env
```

修改以下配置：

```
# 数据库（Neon PostgreSQL）- 使用之前配置的连接字符串
DATABASE_URL="postgresql://neondb_owner:你的密码@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:你的密码@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# JWT - 生成一个随机字符串
JWT_SECRET="这里填入一个随机的长字符串"

# CORS - 替换为你的前端域名
CORS_ALLOWED_ORIGINS="http://localhost:5176,https://your-frontend.vercel.app"

# 七牛云存储 - 使用你的七牛云配置
QINIU_ACCESS_KEY="你的七牛AccessKey"
QINIU_SECRET_KEY="你的七牛SecretKey"
QINIU_BUCKET="jiebian"
QINIU_DOMAIN="http://teyujjlpa.hn-bkt.clouddn.com"

NODE_ENV=production
PORT=3000
```

保存退出：`Ctrl + O`，`Enter`，`Ctrl + X`

---

## 第五步：重启后端服务

```bash
pm2 restart street-food-api
pm2 logs street-food-api  # 查看日志确认启动成功
```

---

## 第六步：配置域名（可选）

如果你有域名，可以绑定到服务器：

1. 在域名服务商添加 DNS 记录：
   - **类型**: A
   - **主机记录**: @ 或 api
   - **记录值**: 你的服务器 IP

2. 在 Nginx 配置中启用域名：
```bash
nano /etc/nginx/sites-available/street-food-api
```
把 `server_name` 后面的 `your-domain.com` 改成你的真实域名。

3. 重载 Nginx：
```bash
nginx -t && systemctl reload nginx
```

---

## 第七步：配置 SSL（强烈推荐）

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

按提示完成配置，证书会自动续期。

---

## 第八步：验证后端部署

```bash
# 测试 API 是否正常
curl http://localhost:3000/api/health

# 或测试公网访问
curl http://你的服务器IP:3000/api/health
```

---

## 第九步：部署前端到 Vercel

1. 在 [vercel.com](https://vercel.com) 导入 GitHub 仓库
2. 选择 `frontend` 作为 Root Directory
3. 在环境变量中添加：
   ```
   VITE_API_BASE_URL = https://你的后端域名/api
   ```
4. Deploy

---

## 更新代码

```bash
cd /var/www/street-food-platform
git pull origin main

# 重新构建
cd backend
npm install
npx prisma generate
npm run build

# 重启服务
pm2 restart street-food-api
```

---

## 常用命令

```bash
pm2 status              # 查看服务状态
pm2 logs street-food-api   # 查看日志
pm2 restart street-food-api   # 重启服务
pm2 stop street-food-api     # 停止服务

nginx -t             # 检查 Nginx 配置
systemctl reload nginx   # 重载 Nginx
systemctl status nginx   # 查看 Nginx 状态
```

---

## 常见问题

### 1. 数据库连接失败
- 检查 Neon PostgreSQL 连接字符串是否正确
- 确认 IP 白名单允许阿里云服务器 IP

### 2. 七牛云上传失败
- 确认 Access Key 和 Secret Key 正确
- 确认 bucket 名称和域名正确

### 3. 前端无法访问后端
- 检查 CORS 配置是否包含前端域名
- 检查 Nginx 反向代理是否正常
- 确认防火墙开放了 80 和 443 端口
