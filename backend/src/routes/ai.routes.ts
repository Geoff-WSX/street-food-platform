import { Router } from 'express';
import { chat } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// AI 对话接口（需要登录）
router.post('/chat', authenticate, chat);

export default router;
