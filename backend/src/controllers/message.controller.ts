import { Response } from 'express';
import { AuthRequest } from '../types';
import * as messageService from '../services/message.service';
import { successResponse, errorResponse } from '../utils/response';

// 获取对话列表
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await messageService.getConversations(req.user!.userId);
    return successResponse(res, conversations);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'GET_CONVERSATIONS_FAILED');
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'GET_MESSAGES_FAILED');
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
    if (content.length > 1000) {
      return errorResponse(res, '消息内容不能超过1000个字符', 'CONTENT_TOO_LONG');
    }
    const message = await messageService.sendMessage(req.user!.userId, receiverId, content.trim());
    return successResponse(res, message, '发送成功');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'SEND_MESSAGE_FAILED', 403);
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'MARK_AS_READ_FAILED');
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'CHECK_FAILED');
  }
};

// 获取未读消息数
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await messageService.getUnreadCount(req.user!.userId);
    return successResponse(res, { count });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'GET_UNREAD_COUNT_FAILED');
  }
};

// 屏蔽用户
export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockedId = parseInt(req.params.userId);
    if (isNaN(blockedId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }
    await messageService.blockUser(req.user!.userId, blockedId);
    return successResponse(res, { message: '屏蔽成功' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'BLOCK_USER_FAILED');
  }
};

// 取消屏蔽用户
export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockedId = parseInt(req.params.userId);
    if (isNaN(blockedId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }
    await messageService.unblockUser(req.user!.userId, blockedId);
    return successResponse(res, { message: '取消屏蔽成功' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'UNBLOCK_USER_FAILED');
  }
};

// 获取已屏蔽用户列表
export const getBlockedUsers = async (req: AuthRequest, res: Response) => {
  try {
    const blockedUsers = await messageService.getBlockedUsers(req.user!.userId);
    return successResponse(res, blockedUsers);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'GET_BLOCKED_USERS_FAILED');
  }
};

// 删除消息
export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return errorResponse(res, '无效的消息ID', 'INVALID_PARAM');
    }
    await messageService.deleteMessage(messageId, req.user!.userId);
    return successResponse(res, { message: '删除成功' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'DELETE_MESSAGE_FAILED');
  }
};

// 删除对话
export const deleteConversation = async (req: AuthRequest, res: Response) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    if (isNaN(otherUserId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }
    await messageService.deleteConversation(req.user!.userId, otherUserId);
    return successResponse(res, { message: '删除对话成功' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'DELETE_CONVERSATION_FAILED');
  }
};

// 撤回消息（2分钟内）
export const recallMessage = async (req: AuthRequest, res: Response) => {
  try {
    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return errorResponse(res, '无效的消息ID', 'INVALID_PARAM');
    }
    const result = await messageService.recallMessage(messageId, req.user!.userId);
    return successResponse(res, result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'RECALL_MESSAGE_FAILED');
  }
};

// 批量删除消息
export const batchDeleteMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds)) {
      return errorResponse(res, 'messageIds 必须是数组', 'INVALID_PARAM');
    }
    const result = await messageService.batchDeleteMessages(messageIds, req.user!.userId);
    return successResponse(res, result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return errorResponse(res, errorMessage, 'BATCH_DELETE_FAILED');
  }
};
