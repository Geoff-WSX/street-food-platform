import prisma from '../services/db/prisma';
import { pushFriendRequestNotification, pushFriendAcceptedNotification } from '../websocket/notification';

/**
 * 规范化用户ID对（确保 userId1 < userId2）
 */
const normalizePair = (userId1: number, userId2: number) => {
  return userId1 < userId2
    ? { userId1, userId2 }
    : { userId1: userId2, userId2: userId1 };
};

/**
 * 发送好友请求
 */
export const sendFriendRequest = async (
  senderId: number,
  receiverId: number,
  message?: string
) => {
  // 不能向自己发送请求
  if (senderId === receiverId) {
    throw new Error('不能向自己发送好友请求');
  }

  // 检查是否已经是好友
  const { userId1, userId2 } = normalizePair(senderId, receiverId);
  const existingFriendship = await prisma.friendships.findUnique({
    where: { userId1_userId2: { userId1, userId2 } },
  });

  if (existingFriendship) {
    throw new Error('你们已经是好友了');
  }

  // 检查是否已有待处理的请求
  const existingRequest = await prisma.friend_requests.findUnique({
    where: { senderId_receiverId: { senderId, receiverId } },
  });

  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      throw new Error('已经发送过好友请求，请等待对方处理');
    }
    if (existingRequest.status === 'rejected') {
      // 如果之前被拒绝过，可以重新发送
      const updated = await prisma.friend_requests.update({
        where: { id: existingRequest.id },
        data: { status: 'pending', message, updatedAt: new Date() },
      });
      // 发送通知
      await pushFriendRequestNotification(receiverId, senderId, message);
      return updated;
    }
  }

  // 检查对方是否已经向我发送过请求
  const reverseRequest = await prisma.friend_requests.findUnique({
    where: { senderId_receiverId: { senderId: receiverId, receiverId: senderId } },
  });

  if (reverseRequest && reverseRequest.status === 'pending') {
    // 对方已向我发送请求，直接接受
    const result = await acceptFriendRequest(reverseRequest.id, senderId);

    // 获取用户名
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true }
    });
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { username: true }
    });

    return {
      ...result,
      autoAccepted: true,
      message: `${receiver?.username} 也想添加你为好友，你们已成为好友！`,
      senderName: sender?.username,
      receiverName: receiver?.username
    };
  }

  // 创建新请求
  const request = await prisma.friend_requests.create({
    data: {
      senderId,
      receiverId,
      message,
    },
    include: {
      users_friend_requests_senderIdTousers: {
        select: { id: true, username: true, avatar: true, avatarData: true, bio: true },
      },
      users_friend_requests_receiverIdTousers: {
        select: { id: true, username: true, avatar: true, avatarData: true, bio: true },
      },
    },
  });

  // 发送实时通知
  await pushFriendRequestNotification(receiverId, senderId, message);

  return request;
};

/**
 * 获取收到的好友请求
 */
export const getReceivedRequests = async (userId: number) => {
  const requests = await prisma.friend_requests.findMany({
    where: {
      receiverId: userId,
      status: 'pending',
    },
    include: {
      users_friend_requests_senderIdTousers: {
        select: { id: true, username: true, avatar: true, avatarData: true, bio: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    receiverId: r.receiverId,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt,
    sender: r.users_friend_requests_senderIdTousers,
  }));
};

/**
 * 获取发出的好友请求
 */
export const getSentRequests = async (userId: number) => {
  const requests = await prisma.friend_requests.findMany({
    where: {
      senderId: userId,
      status: 'pending',
    },
    include: {
      users_friend_requests_receiverIdTousers: {
        select: { id: true, username: true, avatar: true, avatarData: true, bio: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    receiverId: r.receiverId,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt,
    receiver: r.users_friend_requests_receiverIdTousers,
  }));
};

/**
 * 接受好友请求
 */
export const acceptFriendRequest = async (requestId: number, userId: number) => {
  const request = await prisma.friend_requests.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('好友请求不存在');
  }

  if (request.receiverId !== userId) {
    throw new Error('无权处理此请求');
  }

  if (request.status !== 'pending') {
    throw new Error('该请求已被处理');
  }

  // 使用事务创建好友关系并更新请求状态
  const result = await prisma.$transaction(async (tx) => {
    // 更新请求状态
    await tx.friend_requests.update({
      where: { id: requestId },
      data: { status: 'accepted', updatedAt: new Date() },
    });

    // 创建好友关系
    const { userId1, userId2 } = normalizePair(request.senderId, request.receiverId);
    const friendship = await tx.friendships.create({
      data: { userId1, userId2 },
    });

    return friendship;
  });

  // 发送通知给请求发送者
  await pushFriendAcceptedNotification(request.senderId, userId);

  return result;
};

/**
 * 拒绝好友请求
 */
export const rejectFriendRequest = async (requestId: number, userId: number) => {
  const request = await prisma.friend_requests.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('好友请求不存在');
  }

  if (request.receiverId !== userId) {
    throw new Error('无权处理此请求');
  }

  const updated = await prisma.friend_requests.update({
    where: { id: requestId },
    data: { status: 'rejected', updatedAt: new Date() },
  });

  return updated;
};

/**
 * 取消好友请求
 */
export const cancelFriendRequest = async (requestId: number, userId: number) => {
  const request = await prisma.friend_requests.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('好友请求不存在');
  }

  if (request.senderId !== userId) {
    throw new Error('无权取消此请求');
  }

  await prisma.friend_requests.delete({
    where: { id: requestId },
  });

  return { success: true };
};

/**
 * 获取好友列表
 */
export const getFriends = async (
  userId: number,
  page: number = 1,
  pageSize: number = 20,
  search?: string
) => {
  const skip = (page - 1) * pageSize;

  // 获取所有好友关系
  const friendships = await prisma.friendships.findMany({
    where: {
      OR: [{ userId1: userId }, { userId2: userId }],
    },
    orderBy: { createdAt: 'desc' },
  });

  // 提取好友ID列表
  const friendIds = friendships.map((f) =>
    f.userId1 === userId ? f.userId2 : f.userId1
  );

  // 构建查询条件
  const where: any = { id: { in: friendIds } };
  if (search) {
    where.username = { contains: search };
  }

  // 获取好友详情
  const [friends, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, username: true, avatar: true, avatarData: true, bio: true, createdAt: true },
      skip,
      take: pageSize,
      orderBy: { username: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    friends: friends.map((f) => {
      const friendship = friendships.find(
        (fs) => fs.userId1 === f.id || fs.userId2 === f.id
      );
      return {
        ...f,
        establishedAt: friendship?.createdAt,
      };
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取好友数量
 */
export const getFriendsCount = async (userId: number) => {
  const count = await prisma.friendships.count({
    where: {
      OR: [{ userId1: userId }, { userId2: userId }],
    },
  });

  return count;
};

/**
 * 检查是否为好友
 */
export const checkFriendship = async (userId: number, targetId: number) => {
  const { userId1, userId2 } = normalizePair(userId, targetId);

  const friendship = await prisma.friendships.findUnique({
    where: { userId1_userId2: { userId1, userId2 } },
  });

  return { isFriend: !!friendship };
};

/**
 * 删除好友
 */
export const removeFriend = async (userId: number, friendId: number) => {
  const { userId1, userId2 } = normalizePair(userId, friendId);

  const friendship = await prisma.friendships.findUnique({
    where: { userId1_userId2: { userId1, userId2 } },
  });

  if (!friendship) {
    throw new Error('好友关系不存在');
  }

  await prisma.friendships.delete({
    where: { id: friendship.id },
  });

  // 同时删除可能存在的好友请求记录
  await prisma.friend_requests.deleteMany({
    where: {
      OR: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
    },
  });

  return { success: true };
};

/**
 * 获取好友推荐（基于共同关注）
 */
export const getFriendRecommendations = async (userId: number, limit: number = 10) => {
  // 获取我关注的用户
  const myFollowing = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const followingIds = myFollowing.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return [];
  }

  // 获取我的好友
  const friendships = await prisma.friendships.findMany({
    where: { OR: [{ userId1: userId }, { userId2: userId }] },
  });

  const friendIds = new Set(
    friendships.map((f) => (f.userId1 === userId ? f.userId2 : f.userId1))
  );
  friendIds.add(userId); // 排除自己

  // 查找共同关注最多的用户
  const mutualFollows = await prisma.follow.findMany({
    where: {
      followerId: { in: followingIds },
      followingId: { notIn: [...friendIds] },
    },
    select: { followingId: true },
  });

  // 统计出现次数
  const countMap = new Map<number, number>();
  mutualFollows.forEach((f) => {
    countMap.set(f.followingId, (countMap.get(f.followingId) || 0) + 1);
  });

  // 排序并取前N个
  const sortedIds = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (sortedIds.length === 0) {
    return [];
  }

  // 获取用户详情
  const users = await prisma.user.findMany({
    where: { id: { in: sortedIds } },
    select: { id: true, username: true, avatar: true, avatarData: true, bio: true },
  });

  // 按推荐度排序
  return sortedIds
    .map((id) => {
      const user = users.find((u) => u.id === id);
      return user ? { ...user, mutualCount: countMap.get(id) || 0 } : null;
    })
    .filter(Boolean) as Array<{
    id: number;
    username: string;
    avatar: string | null;
    bio: string | null;
    mutualCount: number;
  }>;
};