import { Response } from 'express';
import { AuthRequest } from '../types';
import * as notificationService from '../services/notification.service';

/**
 * 获取通知列表
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const result = await notificationService.getUserNotifications(userId, page, pageSize);
    res.json(result);
  } catch (error: any) {
    console.error('获取通知失败:', error);
    res.status(500).json({ message: error.message || '获取通知失败' });
  }
};

/**
 * 获取未读通知数量
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error: any) {
    console.error('获取未读数量失败:', error);
    res.status(500).json({ message: error.message || '获取未读数量失败' });
  }
};

/**
 * 标记通知为已读
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    const userId = req.user!.userId;

    await notificationService.markAsRead(notificationId, userId);
    res.json({ message: '标记成功' });
  } catch (error: any) {
    console.error('标记已读失败:', error);
    res.status(400).json({ message: error.message || '标记失败' });
  }
};

/**
 * 标记所有通知为已读
 */
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    await notificationService.markAllAsRead(userId);
    res.json({ message: '标记成功' });
  } catch (error: any) {
    console.error('标记全部已读失败:', error);
    res.status(500).json({ message: error.message || '标记失败' });
  }
};

/**
 * 删除通知
 */
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    const userId = req.user!.userId;

    await notificationService.deleteNotification(notificationId, userId);
    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('删除通知失败:', error);
    res.status(400).json({ message: error.message || '删除失败' });
  }
};
