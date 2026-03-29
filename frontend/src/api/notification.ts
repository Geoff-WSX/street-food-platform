import api from './index';
import type { Notification } from '../types';

/**
 * 获取通知列表
 */
export const getNotifications = (params?: { page?: number; pageSize?: number }) => {
  return api.get<{
    data: Notification[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>('/notifications', { params });
};

/**
 * 获取未读通知数量
 */
export const getUnreadCount = () => {
  return api.get<{ count: number }>('/notifications/unread-count');
};

/**
 * 标记通知为已读
 */
export const markAsRead = (id: number) => {
  return api.put<{ message: string }>(`/notifications/${id}/read`);
};

/**
 * 标记所有通知为已读
 */
export const markAllAsRead = () => {
  return api.put<{ message: string }>('/notifications/read-all');
};

/**
 * 删除通知
 */
export const deleteNotification = (id: number) => {
  return api.delete<{ message: string }>(`/notifications/${id}`);
};
