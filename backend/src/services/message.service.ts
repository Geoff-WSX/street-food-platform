import prisma from '../config/database';

/**
 * 获取或创建对话
 */
const getOrCreateConversation = async (userId1: number, userId2: number) => {
  // 确保 userId1 < userId2 以保持一致性
  const [uid1, uid2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  let conversation = await prisma.conversation.findUnique({
    where: {
      userId1_userId2: {
        userId1: uid1,
        userId2: uid2,
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId1: uid1,
        userId2: uid2,
      },
    });
  }

  return conversation;
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
    select: { allowMessage: true },
  });

  if (!receiver || !receiver.allowMessage) {
    return { canSend: false, reason: '对方未开启私信功能' };
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
