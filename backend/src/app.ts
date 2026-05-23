import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';

import authRoutes from './routes/auth.routes';
import phoneAuthRoutes from './routes/phoneAuth.routes';
import captchaRoutes from './routes/captcha.routes';
import smsRoutes from './routes/sms.routes';
import userRoutes from './routes/user.routes';
import postRoutes from './routes/post.routes';
import favoriteFolderRoutes from './routes/favoriteFolder.routes';
import followRoutes from './routes/follow.routes';
import friendRoutes from './routes/friend.routes';
import blockRoutes from './routes/block.routes';
import messageRoutes from './routes/message.routes';
import adminRoutes from './routes/admin.routes';
import adminLogRoutes from './routes/adminLog.routes';
import reportRoutes from './routes/report.routes';
import aiRoutes from './routes/ai.routes';
import commentRoutes from './routes/comment.routes';
import notificationRoutes from './routes/notification.routes';
import searchRoutes from './routes/search.routes';
import uploadRoutes from './routes/upload.routes';
import tagRoutes from './routes/tag.routes';
import topicRoutes from './routes/topic.routes';
import shareRoutes from './routes/share.routes';
import levelRoutes from './routes/level.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initWebSocket } from './websocket';

// ========== 安全中间件导入 ==========
import {
  applySecurityMiddleware,
  apiLimiter,
  authLimiter,
  progressiveLoginLimiter,
  uploadLimiter,
  aiLimiter,
  searchLimiter,
  corsOptions,
  adminIpWhitelist
} from './middleware/security';
import { sanitizeBody } from './middleware/validation';
import { checkBlacklist } from './utils/jwtBlacklist';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

// ========== 应用安全中间件 ==========
applySecurityMiddleware(app);

// CORS 配置（使用安全的 CORS 选项）
app.use(cors(corsOptions));

// 请求体解析和清理
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求体清理（防止注入攻击）
app.use(sanitizeBody);

// 静态文件（开发环境本地图片，生产环境使用七牛云 CDN）
if (process.env.NODE_ENV === 'development') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// ========== 路由（应用限流和安全检查）==========

// 验证码路由（不需要限流）
app.use('/api/captcha', captchaRoutes);

// 认证路由（严格限流 + 登录限制）
app.use('/api/auth', progressiveLoginLimiter, authLimiter, authRoutes);

// 手机号认证路由（登录限制）
app.use('/api/auth', progressiveLoginLimiter, phoneAuthRoutes);

// 短信路由（登录限制 + 限流）
app.use('/api/sms', progressiveLoginLimiter, smsRoutes);

// 用户路由（通用限流 + 黑名单检查）
app.use('/api/users', apiLimiter, checkBlacklist, userRoutes);

// 动态路由（通用限流 + 黑名单检查）
app.use('/api/posts', apiLimiter, checkBlacklist, postRoutes);

// 收藏文件夹路由（通用限流 + 黑名单检查）
app.use('/api/favorites', apiLimiter, checkBlacklist, favoriteFolderRoutes);

// 关注路由（通用限流 + 黑名单检查）
app.use('/api/follows', apiLimiter, checkBlacklist, followRoutes);

// 好友路由（通用限流 + 黑名单检查）
app.use('/api/friends', apiLimiter, checkBlacklist, friendRoutes);

// 拉黑路由（通用限流 + 黑名单检查）
app.use('/api/blocks', apiLimiter, checkBlacklist, blockRoutes);

// 消息路由（通用限流 + 黑名单检查）
app.use('/api/messages', apiLimiter, checkBlacklist, messageRoutes);

// 管理路由（通用限流 + 黑名单检查 + IP 白名单）
app.use('/api/admin', apiLimiter, checkBlacklist, adminIpWhitelist, adminRoutes);

// 管理日志路由（通用限流 + 黑名单检查 + IP 白名单）
app.use('/api/admin', apiLimiter, checkBlacklist, adminIpWhitelist, adminLogRoutes);

// 举报路由（通用限流 + 黑名单检查）
app.use('/api/reports', apiLimiter, checkBlacklist, reportRoutes);

// AI 助手路由（AI 限流 + 黑名单检查）
app.use('/api/ai', aiLimiter, checkBlacklist, aiRoutes);

// 评论路由（通用限流 + 黑名单检查）
app.use('/api', apiLimiter, checkBlacklist, commentRoutes);

// 通知路由（通用限流 + 黑名单检查）
app.use('/api/notifications', apiLimiter, checkBlacklist, notificationRoutes);

// 搜索路由（搜索限流 + 黑名单检查）
app.use('/api/search', searchLimiter, checkBlacklist, searchRoutes);

// 标签路由（通用限流 + 黑名单检查）
app.use('/api/tags', apiLimiter, checkBlacklist, tagRoutes);

// 话题路由（通用限流 + 黑名单检查）
app.use('/api/topics', apiLimiter, checkBlacklist, topicRoutes);

// 等级路由（通用限流 + 黑名单检查）
app.use('/api/levels', apiLimiter, checkBlacklist, levelRoutes);

// 分享路由（通用限流 + 黑名单检查）
app.use('/api/share', apiLimiter, checkBlacklist, shareRoutes);

// 上传路由（上传限流 + 黑名单检查）
app.use('/upload', uploadLimiter, checkBlacklist, uploadRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

httpServer.listen(PORT, () => {
  // 初始化 WebSocket
  initWebSocket(httpServer);
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 运行在 ws://localhost:${PORT}/ws`);
});

export default app;
