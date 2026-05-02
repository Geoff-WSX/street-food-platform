import { sendToUser } from './index';
import prisma from '../services/db/prisma';
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
          avatarData: true,
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
    select: { id: true, username: true, avatar: true, avatarData: true },
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
    select: { id: true, username: true, avatar: true, avatarData: true },
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

/**
 * 推送好友请求通知
 */
export async function pushFriendRequestNotification(
  userId: number,
  actorId: number,
  message?: string
) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, username: true, avatar: true, avatarData: true },
  });

  if (actor) {
    // 存储到数据库（用于离线通知）
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.FRIEND_REQUEST,
        actorId,
        entityId: actorId,
        entityType: EntityType.USER,
      },
    });

    // 实时推送
    sendToUser(userId, 'friend_request', {
      id: notification.id,
      type: 'FRIEND_REQUEST',
      actor,
      message,
      content: `${actor.username} 请求添加你为好友`,
      createdAt: notification.createdAt.toISOString(),
    });
  }
}

/**
 * 推送好友请求接受通知
 */
export async function pushFriendAcceptedNotification(userId: number, actorId: number) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, username: true, avatar: true, avatarData: true },
  });

  if (actor) {
    // 存储到数据库（用于离线通知）
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.FRIEND_ACCEPTED,
        actorId,
        entityId: actorId,
        entityType: EntityType.USER,
      },
    });

    // 实时推送
    sendToUser(userId, 'friend_accepted', {
      id: notification.id,
      type: 'FRIEND_ACCEPTED',
      actor,
      content: `${actor.username} 已接受你的好友请求`,
      createdAt: notification.createdAt.toISOString(),
    });
  }
}

/**
 * 推送任务完成通知
 */
export function pushTaskCompleteNotification(userId: number, data: {
  taskKey: string;
  taskName: string;
  expReward: number;
}) {
  // 存储到数据库（用于离线通知）
  const notification = prisma.notification.create({
    data: {
      userId,
      type: NotificationType.TASK_COMPLETE,
      actorId: userId, // 任务完成通知没有特定 actor
      entityId: 0,
      entityType: EntityType.USER,
    },
  });

  sendToUser(userId, 'notification', {
    type: 'TASK_COMPLETE',
    content: `完成了任务「${data.taskName}」，获得 ${data.expReward} 经验值`,
    entityType: 'task',
    expReward: data.expReward,
  });
}

/**
 * 推送升级通知
 */
export function pushLevelUpNotification(userId: number, data: {
  oldLevel: number;
  newLevel: number;
  levelName: string;
}) {
  // 存储到数据库（用于离线通知）
  prisma.notification.create({
    data: {
      userId,
      type: NotificationType.LEVEL_UP,
      actorId: userId, // 升级通知没有特定 actor
      entityId: 0,
      entityType: EntityType.USER,
    },
  });

  sendToUser(userId, 'notification', {
    type: 'LEVEL_UP',
    content: `恭喜！你的等级提升到 Lv${data.newLevel} ${data.levelName}`,
    entityType: 'level',
    oldLevel: data.oldLevel,
    newLevel: data.newLevel,
  });
}

export default {
  pushNotification,
  pushMessage,
  pushLikeNotification,
  pushFollowNotification,
  pushFriendRequestNotification,
  pushFriendAcceptedNotification,
  pushTaskCompleteNotification,
  pushLevelUpNotification,
};