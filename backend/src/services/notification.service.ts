import prisma from '../services/db/prisma';

/**
 * 通知类型枚举
 */
export enum NotificationType {
  COMMENT = 'COMMENT',       // 评论了我的动态
  REPLY = 'REPLY',           // 回复了我的评论
  LIKE = 'LIKE',             // 点赞了我的动态
  COMMENT_LIKE = 'COMMENT_LIKE', // 点赞了我的评论
  FAVORITE = 'FAVORITE',     // 收藏了我的动态
  FOLLOW = 'FOLLOW',         // 关注了我
}

/**
 * 实体类型枚举
 */
export enum EntityType {
  POST = 'POST',
  COMMENT = 'COMMENT',
  USER = 'USER',
}

/**
 * 安全解析 images 字段
 */
const parseImages = (imagesStr: string | null): string[] => {
  if (!imagesStr || imagesStr === '' || imagesStr === '[]') {
    return [];
  }
  try {
    const parsed = JSON.parse(imagesStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * 创建通知
 */
export const createNotification = async (data: {
  userId: number;           // 接收者
  type: NotificationType;
  actorId: number;          // 触发者
  entityId: number;
  entityType: EntityType;
}) => {
  // 不给自己创建通知
  if (data.userId === data.actorId) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      actorId: data.actorId,
      entityId: data.entityId,
      entityType: data.entityType,
    },
  });

  return notification;
};

/**
 * 获取用户通知列表（分页）
 */
export const getUserNotifications = async (
  userId: number,
  page: number = 1,
  pageSize: number = 20
) => {
  const skip = (page - 1) * pageSize;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.notification.count({
      where: { userId },
    }),
  ]);

  // 批量获取关联实体信息
  const notificationsWithDetails = await Promise.all(
    notifications.map(async (notification) => {
      let relatedData: any = {};

      // 根据实体类型获取关联数据
      if (notification.entityType === EntityType.POST) {
        const post = await prisma.post.findUnique({
          where: { id: notification.entityId },
          select: {
            id: true,
            content: true,
            images: true,
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        });
        if (post) {
          relatedData.post = {
            ...post,
            images: parseImages(post.images),
          };
        }
      } else if (notification.entityType === EntityType.COMMENT) {
        const comment = await prisma.comment.findUnique({
          where: { id: notification.entityId },
          select: {
            id: true,
            content: true,
            post: {
              select: {
                id: true,
                content: true,
              },
            },
          },
        });
        if (comment) {
          relatedData.comment = comment;
        }
      }

      return {
        ...notification,
        ...relatedData,
      };
    })
  );

  return {
    data: notificationsWithDetails,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取未读通知数量
 */
export const getUnreadCount = async (userId: number) => {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return count;
};

/**
 * 标记通知为已读
 */
export const markAsRead = async (notificationId: number, userId: number) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('通知不存在');
  }

  if (notification.userId !== userId) {
    throw new Error('无权操作此通知');
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return { success: true };
};

/**
 * 标记所有通知为已读
 */
export const markAllAsRead = async (userId: number) => {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return { success: true };
};

/**
 * 删除通知
 */
export const deleteNotification = async (notificationId: number, userId: number) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('通知不存在');
  }

  if (notification.userId !== userId) {
    throw new Error('无权操作此通知');
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return { success: true };
};
