import prisma from '../services/db/prisma';
import { pushNotification } from '../websocket/notification';
import { NotificationType, EntityType } from '../services/notification.service';

/**
 * 从文本中提取@用户名
 */
const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = content.match(mentionRegex) || [];
  return [...new Set(matches.map(m => m.slice(1)))]; // 去重
};

/**
 * 处理帖子中的@提及
 */
export const handlePostMentions = async (postId: number, content: string, authorId: number) => {
  const usernames = extractMentions(content);
  if (usernames.length === 0) return;

  // 查找这些用户名的用户
  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  });

  if (users.length === 0) return;

  // 创建提及记录并发送通知
  for (const user of users) {
    if (user.id === authorId) continue; // 不@自己

    await prisma.mention.create({
      data: { postId, userId: user.id },
    });

    // 发送通知
    await pushNotification({
      type: 'mention' as NotificationType,
      actorId: authorId,
      targetUserId: user.id,
      entityId: postId,
      entityType: 'post' as EntityType,
    });
  }
};

/**
 * 处理评论中的@提及
 */
export const handleCommentMentions = async (commentId: number, content: string, authorId: number) => {
  const usernames = extractMentions(content);
  if (usernames.length === 0) return;

  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  });

  if (users.length === 0) return;

  for (const user of users) {
    if (user.id === authorId) continue;

    await prisma.mention.create({
      data: { commentId, userId: user.id },
    });

    await pushNotification({
      type: 'mention' as NotificationType,
      actorId: authorId,
      targetUserId: user.id,
      entityId: commentId,
      entityType: 'comment' as EntityType,
    });
  }
};

/**
 * 删除帖子时清理提及记录
 */
export const deletePostMentions = async (postId: number) => {
  await prisma.mention.deleteMany({
    where: { postId },
  });
};

/**
 * 删除评论时清理提及记录
 */
export const deleteCommentMentions = async (commentId: number) => {
  await prisma.mention.deleteMany({
    where: { commentId },
  });
};
