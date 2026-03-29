import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import postRoutes from './routes/post.routes';
import followRoutes from './routes/follow.routes';
import blockRoutes from './routes/block.routes';
import messageRoutes from './routes/message.routes';
import adminRoutes from './routes/admin.routes';
import reportRoutes from './routes/report.routes';
import aiRoutes from './routes/ai.routes';
import commentRoutes from './routes/comment.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传的图片）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', commentRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

export default app;
