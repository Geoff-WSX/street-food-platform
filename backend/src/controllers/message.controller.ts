import { Response } from 'express';
import { AuthRequest } from '../types';
import * as messageService from '../services/message.service';
import { successResponse, errorResponse } from '../utils/response';

// 获取对话列表
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await messageService.getConversations(req.user!.userId);
    return successResponse(res, conversations);
  } catch (error: any) {
    return errorResponse(res, error.message, 'GET_CONVERSATIONS_FAILED');
  }
};

// 获取对话中的消息
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    if (isNaN(otherUserId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }
    const messages = await messageService.getMessages(req.user!.userId, otherUserId);
    return successResponse(res, messages);
  } catch (error: any) {
    return errorResponse(res, error.message, 'GET_MESSAGES_FAILED');
  }
};

// 发送消息
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const receiverId = parseInt(req.params.userId);
    if (isNaN(receiverId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return errorResponse(res, '消息内容不能为空', 'EMPTY_CONTENT');
    }
    const message = await messageService.sendMessage(req.user!.userId, receiverId, content.trim());
    return successResponse(res, message, '发送成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'SEND_MESSAGE_FAILED', 403);
  }
};

// 标记消息为已读
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    if (isNaN(otherUserId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }
    await messageService.markAsRead(req.user!.userId, otherUserId);
    return successResponse(res, { message: '标记成功' });
  } catch (error: any) {
    return errorResponse(res, error.message, 'MARK_AS_READ_FAILED');
  }
};

// 检查是否可以发送消息（关注后可发一条，对方回复后可无限发）
export const checkCanSendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    if (isNaN(otherUserId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }
    const result = await messageService.checkCanSendMessage(req.user!.userId, otherUserId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'CHECK_FAILED');
  }
};

// 获取未读消息数
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await messageService.getUnreadCount(req.user!.userId);
    return successResponse(res, { count });
  } catch (error: any) {
    return errorResponse(res, error.message, 'GET_UNREAD_COUNT_FAILED');
  }
};
