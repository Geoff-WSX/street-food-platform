import prisma from '../services/db/prisma';
import { pushMessage } from '../websocket/notification';

/**
 * 获取或创建对话
 */
const getOrCreateConversation = async (userId1: number, userId2: number) => {
  // 确保 userId1 < userId2 以保持一致性
  const [uid1, uid2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  try {
    // 使用 upsert 来避免并发创建时的竞态条件
    return await prisma.conversation.upsert({
      where: {
        userId1_userId2: {
          userId1: uid1,
          userId2: uid2,
        },
      },
      create: {
        userId1: uid1,
        userId2: uid2,
      },
      update: {}, // 如果已存在则不更新
    });
  } catch (error: any) {
    // 如果 upsert 失败（极少情况），尝试再次查询
    const conversation = await prisma.conversation.findUnique({
      where: {
        userId1_userId2: {
          userId1: uid1,
          userId2: uid2,
        },
      },
    });

    if (conversation) {
      return conversation;
    }

    throw error;
  }
};

/**
 * 检查是否可以发送消息
 * 规则：陌生人只能发一条消息，对方回复后可以无限发送
 */
export const checkCanSendMessage = async (senderId: number, receiverId: number) => {
  // 不能给自己发消息
  if (senderId === receiverId) {
    throw new Error('不能给自己发送消息');
  }

  // 检查是否被拉黑
  const blocked = await prisma.block.findFirst({
    where: {
      blockerId: receiverId,
      blockedId: senderId,
    },
  });

  if (blocked) {
    return { canSend: false, reason: '你已被对方拉黑' };
  }

  // 检查对方是否开启了私信功能
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { allowMessage: true, followOnlyMessage: true },
  });

  if (!receiver) {
    return { canSend: false, reason: '用户不存在' };
  }

  // 使用 ?? 操作符处理 NULL 值，默认为 true
  if (receiver.allowMessage === false) {
    return { canSend: false, reason: '对方未开启私信功能' };
  }

  // 检查对方是否设置了仅关注可私信
  if (receiver.followOnlyMessage === true) {
    const followRelation = await prisma.follow.findFirst({
      where: {
        followerId: senderId,
        followingId: receiverId,
      },
    });
    if (!followRelation) {
      return { canSend: false, reason: '对方仅允许关注者发送私信' };
    }
  }

  // 获取对话
  const conversation = await getOrCreateConversation(senderId, receiverId);

  // 统计发送者发送的消息数
  const senderMessages = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      senderId: senderId,
    },
  });

  // 统计接收者发送的消息数（回复）
  const receiverMessages = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      senderId: receiverId,
    },
  });

  // 如果对方已经回复过，可以无限发送
  if (receiverMessages > 0) {
    return { canSend: true, reason: null };
  }

  // 如果发送者还没发过消息，可以发送第一条
  if (senderMessages === 0) {
    return { canSend: true, reason: null, isInitial: true };
  }

  // 已发送但对方未回复，不能再发送
  return { canSend: false, reason: '等待对方回复后才能继续发送' };
};

/**
 * 发送消息
 */
export const sendMessage = async (senderId: number, receiverId: number, content: string) => {
  // 检查是否可以发送
  const checkResult = await checkCanSendMessage(senderId, receiverId);

  if (!checkResult.canSend) {
    throw new Error(checkResult.reason || '无法发送消息');
  }

  // 获取或创建对话
  const conversation = await getOrCreateConversation(senderId, receiverId);

  // 创建消息
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId,
      content,
    },
    include: {
      conversation: {
        select: {
          userId1: true,
          userId2: true,
        },
      },
    },
  });

  // 更新对话的更新时间
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  // 获取发送者信息
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { id: true, username: true, avatar: true, avatarData: true },
  });

  // 实时推送消息给接收方
  if (sender) {
    pushMessage(receiverId, {
      conversationId: conversation.id,
      senderId: senderId,
      senderName: sender.username,
      senderAvatar: sender.avatarData || sender.avatar,
      content: content,
    });
  }

  return message;
};

/**
 * 获取对话列表
 */
export const getConversations = async (userId: number) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId },
      ],
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // 获取每个对话的未读消息数和对方用户信息
  const result = await Promise.all(
    conversations.map(async (conv) => {
      const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;

      const [unreadCount, otherUser] = await Promise.all([
        prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: otherUserId,
            readAt: null,
          },
        }),
        prisma.user.findUnique({
          where: { id: otherUserId },
          select: {
            id: true,
            username: true,
            avatar: true,
            avatarData: true,
            bio: true,
          },
        }),
      ]);

      return {
        id: conv.id,
        otherUser,
        lastMessage: conv.messages[0] || null,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    })
  );

  return result;
};

/**
 * 获取对话中的消息
 */
export const getMessages = async (userId: number, otherUserId: number) => {
  // 获取对话
  const conversation = await getOrCreateConversation(userId, otherUserId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
    },
    orderBy: { createdAt: 'asc' },
  });

  return messages;
};

/**
 * 标记消息为已读
 */
export const markAsRead = async (userId: number, otherUserId: number) => {
  const conversation = await getOrCreateConversation(userId, otherUserId);

  // 标记对方发送的未读消息为已读
  await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      senderId: otherUserId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
};

/**
 * 获取未读消息数
 */
export const getUnreadCount = async (userId: number) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId },
      ],
    },
    select: { id: true },
  });

  const conversationIds = conversations.map((c) => c.id);

  const unreadCount = await prisma.message.count({
    where: {
      conversationId: { in: conversationIds },
      senderId: { not: userId },
      readAt: null,
    },
  });

  return unreadCount;
};

/**
 * 屏蔽用户
 */
export const blockUser = async (blockerId: number, blockedId: number) => {
  // 不能屏蔽自己
  if (blockerId === blockedId) {
    throw new Error('不能屏蔽自己');
  }

  // 检查用户是否存在
  const blockedUser = await prisma.user.findUnique({
    where: { id: blockedId },
  });

  if (!blockedUser) {
    throw new Error('用户不存在');
  }

  // 检查是否已经屏蔽
  const existing = await prisma.block.findFirst({
    where: {
      blockerId,
      blockedId,
    },
  });

  if (existing) {
    throw new Error('已经屏蔽该用户');
  }

  // 创建屏蔽记录
  await prisma.block.create({
    data: {
      blockerId,
      blockedId,
    },
  });

  return { success: true };
};

/**
 * 取消屏蔽用户
 */
export const unblockUser = async (blockerId: number, blockedId: number) => {
  const block = await prisma.block.findFirst({
    where: {
      blockerId,
      blockedId,
    },
  });

  if (!block) {
    throw new Error('未屏蔽该用户');
  }

  await prisma.block.delete({
    where: { id: block.id },
  });

  return { success: true };
};

/**
 * 获取已屏蔽用户列表
 */
export const getBlockedUsers = async (userId: number) => {
  const blocks = await prisma.block.findMany({
    where: {
      blockerId: userId,
    },
    include: {
      blocked: {
        select: {
          id: true,
          username: true,
          avatar: true,
          avatarData: true,
          bio: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return blocks.map((block) => ({
    id: block.id,
    blockedUser: block.blocked,
    createdAt: block.createdAt,
  }));
};

/**
 * 删除消息
 */
export const deleteMessage = async (messageId: number, userId: number) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('消息不存在');
  }

  // 只能删除自己发送的消息
  if (message.senderId !== userId) {
    throw new Error('只能删除自己发送的消息');
  }

  await prisma.message.delete({
    where: { id: messageId },
  });

  return { success: true };
};

/**
 * 删除整个对话
 */
export const deleteConversation = async (userId: number, otherUserId: number) => {
  const [uid1, uid2] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

  const conversation = await prisma.conversation.findUnique({
    where: {
      userId1_userId2: {
        userId1: uid1,
        userId2: uid2,
      },
    },
  });

  if (!conversation) {
    throw new Error('对话不存在');
  }

  // 删除对话及其所有消息
  await prisma.conversation.delete({
    where: { id: conversation.id },
  });

  return { success: true };
};

/**
 * 撤回消息（2分钟内有效）
 */
export const recallMessage = async (messageId: number, userId: number) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new Error('消息不存在');
  }

  // 只能撤回自己发送的消息
  if (message.senderId !== userId) {
    throw new Error('只能撤回自己发送的消息');
  }

  // 检查是否已撤回
  if (message.recalled) {
    throw new Error('消息已撤回');
  }

  // 检查是否超过2分钟
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  if (message.createdAt < twoMinutesAgo) {
    throw new Error('只能撤回2分钟内的消息');
  }

  // 标记为已撤回
  await prisma.message.update({
    where: { id: messageId },
    data: {
      recalled: true,
      recalledAt: new Date(),
    },
  });

  return { success: true, message: '消息已撤回' };
};

/**
 * 批量删除消息
 */
export const batchDeleteMessages = async (messageIds: number[], userId: number) => {
  if (!messageIds || messageIds.length === 0) {
    throw new Error('请选择要删除的消息');
  }

  if (messageIds.length > 50) {
    throw new Error('一次最多删除50条消息');
  }

  // 验证所有消息都是用户自己发送的
  const messages = await prisma.message.findMany({
    where: {
      id: { in: messageIds },
    },
  });

  const notOwnedMessages = messages.filter((m) => m.senderId !== userId);
  if (notOwnedMessages.length > 0) {
    throw new Error('只能删除自己发送的消息');
  }

  // 批量删除
  const result = await prisma.message.deleteMany({
    where: {
      id: { in: messageIds },
      senderId: userId,
    },
  });

  return { success: true, deletedCount: result.count };
};

/**
 * 搜索消息
 */
export const searchMessages = async (userId: number, keyword: string, userIdFilter?: number) => {
  // 获取用户所有对话
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId },
      ],
    },
  });

  const conversationIds = conversations.map((c) => c.id);

  // 构建查询条件
  const whereCondition: any = {
    conversationId: { in: conversationIds },
    recalled: false,
    content: {
      contains: keyword,
    },
  };

  // 如果指定了用户ID，只搜索与该用户的对话
  if (userIdFilter) {
    const otherUserId = userIdFilter;
    const conversation = await getOrCreateConversation(userId, otherUserId);
    whereCondition.conversationId = conversation.id;
  }

  const messages = await prisma.message.findMany({
    where: whereCondition,
    include: {
      conversation: {
        select: {
          userId1: true,
          userId2: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // 获取每个消息的对方用户信息
  const result = await Promise.all(
    messages.map(async (msg) => {
      const otherUserId = msg.conversation.userId1 === userId ? msg.conversation.userId2 : msg.conversation.userId1;
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true, username: true, avatar: true, avatarData: true },
      });
      return {
        ...msg,
        otherUser,
      };
    })
  );

  return result;
};
