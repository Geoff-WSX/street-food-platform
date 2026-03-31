import { sendToUser } from './index';
import prisma from '../config/database';
import { NotificationType, EntityType } from '../services/notification.service';

// 重新导出
export { NotificationType, EntityType };

interface NotificationPayload {
  type: NotificationType;
  actorId: number;
  targetUserId: number;
  entityId: number;
  entityType: EntityType;
}

/**
 * 创建并发送实时通知
 */
export async function pushNotification(payload: NotificationPayload) {
  const { type, actorId, targetUserId, entityId, entityType } = payload;

  // 不给自己发通知
  if (actorId === targetUserId) {
    return null;
  }

  // 创建通知记录
  const notification = await prisma.notification.create({
    data: {
      userId: targetUserId,
      type,
      actorId,
      entityId,
      entityType,
    },
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  // 实时推送
  sendToUser(targetUserId, 'notification', {
    id: notification.id,
    type: notification.type,
    actor: notification.actor,
    entityId: notification.entityId,
    entityType: notification.entityType,
    createdAt: notification.createdAt.toISOString(),
    isRead: false,
  });

  return notification;
}

/**
 * 推送新消息通知
 */
export function pushMessage(userId: number, data: {
  conversationId: number;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  content: string;
}) {
  sendToUser(userId, 'message', data);
}

/**
 * 推送点赞通知
 */
export async function pushLikeNotification(userId: number, postId: number, actorId: number) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, username: true, avatar: true },
  });

  if (actor) {
    sendToUser(userId, 'notification', {
      type: 'LIKE',
      actor,
      entityId: postId,
      entityType: 'post',
      content: `${actor.username} 赞了你的动态`,
    });
  }
}

/**
 * 推送关注通知
 */
export async function pushFollowNotification(userId: number, actorId: number) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, username: true, avatar: true },
  });

  if (actor) {
    sendToUser(userId, 'notification', {
      type: 'FOLLOW',
      actor,
      entityId: actorId,
      entityType: 'user',
      content: `${actor.username} 关注了你`,
    });
  }
}

export default {
  pushNotification,
  pushMessage,
  pushLikeNotification,
  pushFollowNotification,
};