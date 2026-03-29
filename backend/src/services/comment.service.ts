import prisma from '../config/database';
import { createNotification, NotificationType, EntityType } from './notification.service';

/**
 * 敏感词库 - 文字审查
 */
const SENSITIVE_WORDS = [
  // 脏话/侮辱性词汇
  '傻逼', '傻B', '傻b', 'SB', 'sb', '煞笔', '杀币',
  '妈逼', '妈B', '妈b', '妈的', '妈蛋', '妈了个巴子',
  '狗日', '狗杂种', '狗娘养', '狗屎',
  '操你', '草你', '肏你', '日你',
  '废物', '垃圾', '贱人', '婊子', '婊',
  '死全家', '死妈', '死爹',
  '脑残', '智障', '弱智', '白痴',
  '滚蛋', '滚粗', '爬',
  '他妈', '他娘', '他喵', '特么',

  // 暴力威胁
  '杀你', '砍死', '弄死', '废了你',
  '暴力', '血洗', '轰炸',

  // 色情词汇
  '做爱', '性交', '淫乱', '色情',

  // 违法内容
  '毒品', '吸毒', '大麻', '海洛因', '冰毒',
  '卖淫', '嫖娼',

  // 诈骗相关
  '博彩', '赌博', '赌场', '时时彩',
  '刷单', '兼职刷单', '代刷',

  // 政治敏感
  '法轮', '法轮功',

  // 其他不良信息
  '自杀', '自残',
];

/**
 * 文字审查服务
 */
export const contentModerationService = {
  /**
   * 检查文本是否包含敏感词
   * 使用正则表达式进行匹配，避免误匹配
   */
  checkContent(text: string): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // 使用正则表达式进行全词匹配
    for (const word of SENSITIVE_WORDS) {
      // 创建正则，匹配敏感词（支持中文和英文）
      const regex = new RegExp(word, 'gi');
      if (regex.test(text)) {
        violations.push(word);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  },

  /**
   * 过滤文本中的敏感词（替换为***）
   */
  filterContent(text: string): string {
    let filteredText = text;
    const lowerText = text.toLowerCase();

    for (const word of SENSITIVE_WORDS) {
      const regex = new RegExp(word, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    }

    return filteredText;
  },
};

/**
 * 获取动态的评论列表（支持分页）
 */
export const getComments = async (postId: number, page: number = 1, pageSize: number = 20, userId?: number) => {
  const skip = (page - 1) * pageSize;

  // 获取顶级评论（没有父评论的评论）
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // 只获取顶级评论
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.comment.count({
      where: { postId, parentId: null },
    }),
  ]);

  // 获取用户信息
  const userIds = [...new Set(comments.map(c => c.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, avatar: true },
  });

  const userMap = new Map(users.map(u => [u.id, u]));

  // 获取回复数量
  const replyCounts = await Promise.all(
    comments.map(async (comment) => {
      return prisma.comment.count({
        where: { parentId: comment.id },
      });
    })
  );

  // 获取每个顶级评论的回复（最多显示3条）
  const commentsWithReplies = await Promise.all(
    comments.map(async (comment, index) => {
      const replies = await prisma.comment.findMany({
        where: { parentId: comment.id },
        take: 3,
        orderBy: { createdAt: 'asc' },
      });

      // 获取回复用户信息
      const replyUserIds = [...new Set(replies.map(r => r.userId))];
      const replyUsers = await prisma.user.findMany({
        where: { id: { in: replyUserIds } },
        select: { id: true, username: true, avatar: true },
      });
      const replyUserMap = new Map(replyUsers.map(u => [u.id, u]));

      // 获取当前用户是否点赞了这些评论
      let likedCommentIds: number[] = [];
      let likedReplyIds: number[] = [];

      if (userId) {
        const commentIds = [comment.id, ...replies.map(r => r.id)];
        const likes = await prisma.commentLike.findMany({
          where: {
            userId,
            commentId: { in: commentIds },
          },
        });

        likedCommentIds = likes.filter(l => l.commentId === comment.id).map(l => l.commentId);
        likedReplyIds = likes.filter(l => replies.map(r => r.id).includes(l.commentId)).map(l => l.commentId);
      }

      const replyCount = replyCounts[index];

      return {
        ...comment,
        user: userMap.get(comment.userId)!,
        replyToUser: comment.replyToUserId ? { id: comment.replyToUserId, username: userMap.get(comment.replyToUserId)?.username || '未知用户' } : undefined,
        isLiked: likedCommentIds.includes(comment.id),
        replies: replies.map(reply => ({
          ...reply,
          user: replyUserMap.get(reply.userId)!,
          replyToUser: reply.replyToUserId ? { id: reply.replyToUserId, username: userMap.get(reply.replyToUserId)?.username || '未知用户' } : undefined,
          isLiked: likedReplyIds.includes(reply.id),
        })),
        replyCount,
      };
    })
  );

  return {
    data: commentsWithReplies,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取某条评论的更多回复
 */
export const getCommentReplies = async (parentId: number, page: number = 1, pageSize: number = 10, userId?: number) => {
  const skip = (page - 1) * pageSize;

  const [replies, total] = await Promise.all([
    prisma.comment.findMany({
      where: { parentId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.comment.count({ where: { parentId } }),
  ]);

  // 获取用户信息
  const userIds = [...new Set(replies.map(r => r.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, avatar: true },
  });

  const userMap = new Map(users.map(u => [u.id, u]));

  // 检查点赞状态
  let likedReplyIds: number[] = [];
  if (userId) {
    const likes = await prisma.commentLike.findMany({
      where: {
        userId,
        commentId: { in: replies.map(r => r.id) },
      },
    });
    likedReplyIds = likes.map(l => l.commentId);
  }

  const repliesWithLikeStatus = replies.map(reply => ({
    ...reply,
    user: userMap.get(reply.userId)!,
    replyToUser: reply.replyToUserId ? { id: reply.replyToUserId, username: userMap.get(reply.replyToUserId)?.username || '未知用户' } : undefined,
    isLiked: likedReplyIds.includes(reply.id),
  }));

  return {
    data: repliesWithLikeStatus,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 创建评论
 */
export const createComment = async (userId: number, data: {
  postId: number;
  content: string;
  parentId?: number;
  replyToUserId?: number;
}) => {
  const { postId, content, parentId, replyToUserId } = data;

  // 文字审查
  const moderation = contentModerationService.checkContent(content);
  if (!moderation.valid) {
    throw new Error(`内容包含违规词汇：${moderation.violations.join('、')}`);
  }

  // 验证动态是否存在
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new Error('动态不存在');
  }

  // 如果是回复评论，验证父评论是否存在
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
    });

    if (!parentComment || parentComment.postId !== postId) {
      throw new Error('回复的评论不存在');
    }
  }

  // 如果指定了回复用户，验证用户是否存在
  if (replyToUserId) {
    const replyToUser = await prisma.user.findUnique({
      where: { id: replyToUserId },
    });

    if (!replyToUser) {
      throw new Error('回复的用户不存在');
    }
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      userId,
      content: content.trim(),
      parentId,
      replyToUserId,
    },
  });

  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, avatar: true },
  });

  // 创建通知（异步执行，不影响评论创建）
  setImmediate(async () => {
    try {
      // 如果是回复评论，通知被回复的用户
      if (replyToUserId && replyToUserId !== userId) {
        await createNotification({
          userId: replyToUserId,
          type: NotificationType.REPLY,
          actorId: userId,
          entityId: comment.id,
          entityType: EntityType.COMMENT,
        });
      } else if (post.userId !== userId) {
        // 如果是直接评论动态，通知动态作者（不给自己发通知）
        await createNotification({
          userId: post.userId,
          type: NotificationType.COMMENT,
          actorId: userId,
          entityId: comment.id,
          entityType: EntityType.COMMENT,
        });
      }
    } catch (error) {
      console.error('创建通知失败:', error);
      // 不影响评论创建，只记录错误
    }
  });

  return {
    ...comment,
    user: user!,
    replyToUser: replyToUserId ? { id: replyToUserId, username: (await prisma.user.findUnique({ where: { id: replyToUserId }, select: { username: true } }))!.username } : undefined,
    isLiked: false,
    likeCount: 0,
    replies: [],
    replyCount: 0,
  };
};

/**
 * 删除评论
 */
export const deleteComment = async (commentId: number, userId: number, userRole: string) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      post: {
        select: { id: true, userId: true },
      },
    },
  });

  if (!comment) {
    throw new Error('评论不存在');
  }

  // 只有评论作者、动态作者或管理员可以删除
  const canDelete =
    comment.userId === userId ||
    comment.post.userId === userId ||
    userRole === 'admin';

  if (!canDelete) {
    throw new Error('无权删除此评论');
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return { success: true };
};

/**
 * 点赞/取消点赞评论
 */
export const toggleCommentLike = async (userId: number, commentId: number) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new Error('评论不存在');
  }

  const existingLike = await prisma.commentLike.findUnique({
    where: {
      userId_commentId: {
        userId,
        commentId,
      },
    },
  });

  if (existingLike) {
    // 取消点赞
    await prisma.commentLike.delete({
      where: { id: existingLike.id },
    });

    await prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
    });

    return {
      liked: false,
      likeCount: Math.max(0, comment.likeCount - 1),
    };
  } else {
    // 点赞
    await prisma.commentLike.create({
      data: {
        userId,
        commentId,
      },
    });

    await prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    });

    return {
      liked: true,
      likeCount: comment.likeCount + 1,
    };
  }
};
