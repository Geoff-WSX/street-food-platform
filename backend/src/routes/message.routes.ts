import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有消息路由都需要认证

// GET /api/messages/conversations - 获取对话列表
router.get('/conversations', authenticate, messageController.getConversations);

// GET /api/messages/unread - 获取未读消息数
router.get('/unread', authenticate, messageController.getUnreadCount);

// GET /api/messages/:userId - 获取与指定用户的消息
router.get('/:userId', authenticate, messageController.getMessages);

// POST /api/messages/:userId/check - 检查是否可以发送消息
router.post('/:userId/check', authenticate, messageController.checkCanSendMessage);

// POST /api/messages/:userId - 发送消息
router.post('/:userId', authenticate, messageController.sendMessage);

// PUT /api/messages/:userId/read - 标记消息为已读
router.put('/:userId/read', authenticate, messageController.markAsRead);

export default router;
