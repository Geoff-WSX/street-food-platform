import api from './index';
import type { ApiResponse } from '../types';

export interface Message {
  id: number;
  senderId: number;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: number;
  otherUser: {
    id: number;
    username: string;
    avatar?: string;
  };
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export interface CheckSendMessageResult {
  canSend: boolean;
  reason?: string;
  isInitial?: boolean;
}

// 获取对话列表
export const getConversations = () =>
  api.get<ApiResponse<Conversation[]>>('/messages/conversations').then((r) => r.data.data);

// 获取未读消息数
export const getUnreadCount = () =>
  api.get<ApiResponse<{ count: number }>>('/messages/unread').then((r) => r.data.data);

// 获取与指定用户的消息
export const getMessages = (userId: number) =>
  api.get<ApiResponse<Message[]>>(`/messages/${userId}`).then((r) => r.data.data);

// 检查是否可以发送消息
export const checkCanSendMessage = (userId: number) =>
  api.post<ApiResponse<CheckSendMessageResult>>(`/messages/${userId}/check`).then((r) => r.data.data);

// 发送消息
export const sendMessage = (userId: number, content: string) =>
  api.post<ApiResponse<Message>>(`/messages/${userId}`, { content }).then((r) => r.data.data);

// 标记消息为已读
export const markAsRead = (userId: number) =>
  api.put(`/messages/${userId}/read`).then((r) => r.data);

// 删除消息
export const deleteMessage = (messageId: number) =>
  api.delete(`/messages/${messageId}`).then((r) => r.data);

// 删除对话
export const deleteConversation = (userId: number) =>
  api.delete(`/messages/conversations/${userId}`).then((r) => r.data);

// 屏蔽用户
export const blockUser = (userId: number) =>
  api.post(`/messages/block/${userId}`).then((r) => r.data);

// 取消屏蔽用户
export const unblockUser = (userId: number) =>
  api.delete(`/messages/block/${userId}`).then((r) => r.data);

// 获取已屏蔽用户列表
export const getBlockedUsers = () =>
  api.get<ApiResponse<Array<{
    id: number;
    blockedUser: {
      id: number;
      username: string;
      avatar?: string;
      bio?: string;
    };
    createdAt: string;
  }>>>('/messages/blocked/list').then((r) => r.data.data);
