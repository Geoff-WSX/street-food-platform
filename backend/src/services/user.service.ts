import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { UpdateProfileRequest, ChangePasswordRequest } from '../types';
import { isValidUsername } from '../utils/validator';

/**
 * 获取用户信息（包含统计数据）
 */
export const getUserById = async (userId: number, currentUserId?: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 计算统计数据
  const postCount = await prisma.post.count({
    where: { userId, isPrivate: false },
  });

  const followingCount = await prisma.follow.count({
    where: { followerId: userId },
  });

  const followerCount = await prisma.follow.count({
    where: { followingId: userId },
  });

  // 检查关注状态（如果传入了当前用户ID）
  let isFollowing = false;
  if (currentUserId && currentUserId !== userId) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userId,
        },
      },
    });
    isFollowing = !!follow;
  }

  return {
    ...user,
    postCount,
    followingCount,
    followerCount,
    isFollowing,
  };
};

/**
 * 更新用户资料
 */
export const updateProfile = async (
  userId: number,
  data: UpdateProfileRequest
) => {
  const { username, bio } = data;

  // 验证用户名
  if (username && !isValidUsername(username)) {
    throw new Error('用户名必须是3-20个字符，只能包含字母、数字和下划线');
  }

  // 检查用户名是否已被使用
  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new Error('用户名已被使用');
    }
  }

  // 更新用户
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username && { username }),
      ...(bio !== undefined && { bio }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

/**
 * 更新头像
 */
export const updateAvatar = async (userId: number, avatarPath: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarPath },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

/**
 * 修改密码
 */
export const changePassword = async (
  userId: number,
  data: ChangePasswordRequest
) => {
  const { oldPassword, newPassword } = data;

  // 验证输入
  if (!oldPassword || !newPassword) {
    throw new Error('旧密码和新密码不能为空');
  }

  if (newPassword.length < 6) {
    throw new Error('新密码至少需要6个字符');
  }

  // 获取用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 验证旧密码
  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

  if (!isOldPasswordValid) {
    throw new Error('旧密码不正确');
  }

  // 加密新密码
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 更新密码
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: '密码修改成功' };
};

/**
 * 更新用户设置
 */
export const updateSettings = async (
  userId: number,
  data: { allowMessage?: boolean }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.allowMessage !== undefined && { allowMessage: data.allowMessage }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      allowMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

/**
 * 关注用户
 */
export const followUser = async (followerId: number, followingId: number) => {
  // 不能关注自己
  if (followerId === followingId) {
    throw new Error('不能关注自己');
  }

  // 检查是否已关注
  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  if (existingFollow) {
    throw new Error('已经关注了该用户');
  }

  // 创建关注关系
  await prisma.follow.create({
    data: {
      followerId,
      followingId,
    },
  });

  return { success: true };
};

 /**
 * 取消关注
 */
export const unfollowUser = async (followerId: number, followingId: number) => {
  // 删除关注关系
  await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId,
    },
  });

  return { success: true };
};
/**
 * 获取关注列表
 */
export const getFollowing = async (userId: number, params?: { page?: number; pageSize?: number }, currentUserId?: number) => {
  const { page = 1, pageSize = 20 } = params || {};

  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          avatar: true,
          bio: true,
        },
      },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  });

  // 获取关注的用户ID列表
  const followingUserIds = follows.map(f => f.following.id);

  // 如果有当前用户，检查当前用户是否关注了这些人
  let followingStatus: Record<number, boolean> = {};
  if (currentUserId && followingUserIds.length > 0) {
    const myFollows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: followingUserIds },
      },
      select: { followingId: true },
    });
    myFollows.forEach(f => {
      followingStatus[f.followingId] = true;
    });
  }

  return follows.map(f => ({
    ...f.following,
    isFollowing: currentUserId ? !!followingStatus[f.following.id] : false,
  }));
};
 /**
 * 获取粉丝列表
 */
export const getFollowers = async (userId: number, params?: { page?: number; pageSize?: number }, currentUserId?: number) => {
  const { page = 1, pageSize = 20 } = params || {};

  const follows = await prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          avatar: true,
          bio: true,
        },
      },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  });

  // 获取粉丝的用户ID列表
  const followerUserIds = follows.map(f => f.follower.id);

  // 如果有当前用户，检查当前用户是否关注了这些粉丝
  let followingStatus: Record<number, boolean> = {};
  if (currentUserId && followerUserIds.length > 0) {
    const myFollows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: followerUserIds },
      },
      select: { followingId: true },
    });
    myFollows.forEach(f => {
      followingStatus[f.followingId] = true;
    });
  }

  return follows.map(f => ({
    ...f.follower,
    isFollowing: currentUserId ? !!followingStatus[f.follower.id] : false,
  }));
};
 /**
 * 检查关注状态
 */
export const getFollowStatus = async (currentUserId: number, targetUserId: number) => {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    },
  });

  const reverseFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: targetUserId,
        followingId: currentUserId,
      },
    },
  });

  return {
    following: !!follow,
    followedBy: !!reverseFollow,
  };
};
 /**
 * 拉黑用户
 */
export const blockUser = async (userId: number, blockedId: number) => {
  // 不能拉黑自己
  if (userId === blockedId) {
    throw new Error('不能拉黑自己');
  }

  // 检查是否已拉黑
  const existingBlock = await prisma.block.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId: userId,
        blockedId,
      },
    },
  });

  if (existingBlock) {
    throw new Error('已经拉黑该用户');
  }

  // 如果关注了，先取消关注
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: userId, followingId: blockedId },
        { followerId: blockedId, followingId: userId },
      ],
    },
  });

  // 创建拉黑关系
  await prisma.block.create({
    data: {
      blockerId: userId,
      blockedId,
    },
  });

  return { success: true };
};
 /**
 * 取消拉黑
 */
export const unblockUser = async (userId: number, blockedId: number) => {
  await prisma.block.deleteMany({
    where: {
      blockerId: userId,
      blockedId,
    },
  });

  return { success: true };
};
 /**
 * 获取黑名单列表
 */
export const getBlockedUsers = async (userId: number) => {
  const blocks = await prisma.block.findMany({
    where: { blockerId: userId },
    include: {
      blocked: {
        select: {
          id: true,
          username: true,
          avatar: true,
          bio: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return blocks.map(b => b.blocked);
};
