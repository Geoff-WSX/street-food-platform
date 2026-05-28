import bcrypt from 'bcrypt';
import prisma from '../services/db/prisma';
import { UpdateProfileRequest, ChangePasswordRequest } from '../types';
import { isValidUsername } from '../utils/validator';
import { cacheGet, cacheSet, cacheDel } from './cache';

/**
 * 用户资料缓存键
 */
const USER_PROFILE_CACHE_KEY = 'user:profile';

/**
 * 预设美食头像列表
 */
export const DEFAULT_AVATARS = [
  { id: 'foodie_1', emoji: '🍜', name: '面食爱好者' },
  { id: 'foodie_2', emoji: '🍔', name: '汉堡控' },
  { id: 'foodie_3', emoji: '🍕', name: '披萨达人' },
  { id: 'foodie_4', emoji: '🍣', name: '日料爱好者' },
  { id: 'foodie_5', emoji: '🍦', name: '甜品达人' },
  { id: 'foodie_6', emoji: '🍗', name: '炸鸡专家' },
  { id: 'foodie_7', emoji: '🥗', name: '轻食主义者' },
  { id: 'foodie_8', emoji: '🍰', name: '蛋糕控' },
  { id: 'foodie_9', emoji: '🥟', name: '饺子爱好者' },
  { id: 'foodie_10', emoji: '🍖', name: '烤肉达人' },
  { id: 'foodie_11', emoji: '🌮', name: '墨西哥美食' },
  { id: 'foodie_12', emoji: '🍱', name: '便当达人' },
];

/**
 * 根据预设头像ID生成头像URL（SVG格式）
 */
export const generateDefaultAvatarUrl = (avatarId: string): string => {
  const avatar = DEFAULT_AVATARS.find(a => a.id === avatarId);
  const emoji = avatar?.emoji || '🍜';
  const name = avatar?.name || '美食爱好者';

  // 创建包含emoji的SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFE4D6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FFD4B8;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#bg)"/>
    <circle cx="50" cy="50" r="40" fill="#FFF" opacity="0.5"/>
    <text x="50" y="50" dy="0.35em" text-anchor="middle" font-size="50" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
    <text x="50" y="92" dy="0" text-anchor="middle" font-size="10" fill="#666" font-family="sans-serif">${name}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

/**
 * 获取所有预设头像
 */
export const getDefaultAvatars = () => {
  return DEFAULT_AVATARS.map(a => ({
    ...a,
    url: generateDefaultAvatarUrl(a.id),
  }));
};

/**
 * 获取用户信息（包含统计数据）- 内部函数，缓存基础数据
 */
const getUserByIdInternal = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userLevel: {
        include: {
          level: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 优先使用 avatarData，如果没有则使用 avatar
  const avatar = user.avatarData || user.avatar;

  // 处理等级信息
  const level = user.userLevel?.level ? {
    level: user.userLevel.level.level,
    name: user.userLevel.level.name,
    icon: user.userLevel.level.icon,
  } : undefined;

  // 移除敏感字段
  const { email, avatarData, userLevel, ...safeUser } = user as any;

  return {
    ...safeUser,
    avatar,
    level,
  };
};

/**
 * 获取用户信息（包含统计数据）
 * 基础用户数据缓存60秒，关注状态始终实时获取
 */
export const getUserById = async (userId: number, currentUserId?: number) => {
  const cacheKey = `${USER_PROFILE_CACHE_KEY}:${userId}`;

  // Try to get base user data from cache
  let userData = await cacheGet<any>(cacheKey);

  if (!userData) {
    userData = await getUserByIdInternal(userId);
    // Cache for 60 seconds
    await cacheSet(cacheKey, userData, 60);
  }

  // 计算统计数据（不缓存，因为会频繁变化）
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
    ...userData,
    postCount,
    followingCount,
    followerCount,
    isFollowing,
  };
};

/**
 * 清除用户资料缓存
 */
export const invalidateUserCache = async (userId: number) => {
  const cacheKey = `${USER_PROFILE_CACHE_KEY}:${userId}`;
  await cacheDel(cacheKey);
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
      avatarData: true,
      bio: true,
      role: true,
      allowMessage: true,
      followOnlyMessage: true,
      hideFollowing: true,
      hideFollowers: true,
      hidePosts: true,
      hideFavorites: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 优先使用 avatarData
  const avatar = user.avatarData || user.avatar;

  // 清除用户缓存
  await invalidateUserCache(userId);

  return {
    ...user,
    avatar,
  };
};

/**
 * 更新头像（存储 CDN URL 到数据库）
 */
export const updateAvatar = async (userId: number, avatarData: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      avatar: null, // 清空旧路径
      avatarData: avatarData, // 存储 CDN URL
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      avatarData: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 返回时使用 avatarData 作为 avatar
  // 清除用户缓存
  await invalidateUserCache(userId);

  return {
    ...user,
    avatar: user.avatarData,
  };
};

/**
 * 设置预设头像
 */
export const setDefaultAvatar = async (userId: number, avatarId: string) => {
  // 验证头像ID是否有效
  const avatar = DEFAULT_AVATARS.find(a => a.id === avatarId);
  if (!avatar) {
    throw new Error('无效的头像ID');
  }

  // 生成预设头像URL
  const avatarUrl = generateDefaultAvatarUrl(avatarId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      avatar: avatarId, // 存储预设头像ID
      avatarData: avatarUrl, // 存储生成的URL
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      avatarData: true,
      bio: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 清除用户缓存
  await invalidateUserCache(userId);

  return {
    ...user,
    avatar: user.avatarData,
  };
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
  data: { allowMessage?: boolean; followOnlyMessage?: boolean; hideFollowing?: boolean; hideFollowers?: boolean; hidePosts?: boolean; hideFavorites?: boolean }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.allowMessage !== undefined && { allowMessage: data.allowMessage }),
      ...(data.followOnlyMessage !== undefined && { followOnlyMessage: data.followOnlyMessage }),
      ...(data.hideFollowing !== undefined && { hideFollowing: data.hideFollowing }),
      ...(data.hideFollowers !== undefined && { hideFollowers: data.hideFollowers }),
      ...(data.hidePosts !== undefined && { hidePosts: data.hidePosts }),
      ...(data.hideFavorites !== undefined && { hideFavorites: data.hideFavorites }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      avatarData: true,
      bio: true,
      allowMessage: true,
      followOnlyMessage: true,
      hideFollowing: true,
      hideFollowers: true,
      hidePosts: true,
      hideFavorites: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 优先使用 avatarData
  const avatar = user.avatarData || user.avatar;

  // 清除用户缓存
  await invalidateUserCache(userId);

  return {
    ...user,
    avatar,
  };
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
        include: {
          userLevel: {
            include: {
              level: true,
            },
          },
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

  return follows.map(f => {
    const user = f.following;
    const avatar = user.avatarData || user.avatar;
    const level = user.userLevel?.level ? {
      level: user.userLevel.level.level,
      name: user.userLevel.level.name,
      icon: user.userLevel.level.icon,
    } : undefined;
    return {
      ...user,
      avatar,
      level,
      isFollowing: currentUserId ? !!followingStatus[f.following.id] : false,
    };
  });
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
        include: {
          userLevel: {
            include: {
              level: true,
            },
          },
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

  return follows.map(f => {
    const user = f.follower;
    const avatar = user.avatarData || user.avatar;
    const level = user.userLevel?.level ? {
      level: user.userLevel.level.level,
      name: user.userLevel.level.name,
      icon: user.userLevel.level.icon,
    } : undefined;
    return {
      ...user,
      avatar,
      level,
      isFollowing: currentUserId ? !!followingStatus[f.follower.id] : false,
    };
  });
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
 * 获取用户自定义头像列表
 */
export const getCustomAvatars = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { customAvatars: true },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 解析存储的 JSON 字符串
  const avatars = user.customAvatars ? JSON.parse(user.customAvatars) : [];
  return avatars;
};

/**
 * 添加自定义头像
 */
export const addCustomAvatar = async (userId: number, avatarData: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { customAvatars: true },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 解析现有头像
  const avatars = user.customAvatars ? JSON.parse(user.customAvatars) : [];

  // 生成新头像ID
  const newAvatar = {
    id: `custom_${Date.now()}`,
    url: avatarData,
    createdAt: new Date().toISOString(),
  };

  // 限制最多保存20张自定义头像
  if (avatars.length >= 20) {
    throw new Error('最多只能保存20张自定义头像');
  }

  avatars.unshift(newAvatar);

  await prisma.user.update({
    where: { id: userId },
    data: {
      customAvatars: JSON.stringify(avatars),
    },
  });

  return newAvatar;
};

/**
 * 删除自定义头像
 */
export const deleteCustomAvatar = async (userId: number, avatarId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { customAvatars: true },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const avatars = user.customAvatars ? JSON.parse(user.customAvatars) : [];
  const filteredAvatars = avatars.filter((a: any) => a.id !== avatarId);

  if (filteredAvatars.length === avatars.length) {
    throw new Error('头像不存在');
  }

  // 删除七牛云上的文件
  const deletedAvatar = avatars.find((a: any) => a.id === avatarId);
  if (deletedAvatar?.url) {
    const { qiniuService } = await import('./qiniu.service');
    const key = qiniuService.extractKeyFromUrl(deletedAvatar.url);
    if (key) {
      await qiniuService.deleteFile(key).catch(() => {});
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      customAvatars: JSON.stringify(filteredAvatars),
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
        include: {
          userLevel: {
            include: {
              level: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return blocks.map(b => {
    const user = b.blocked;
    const avatar = user.avatarData || user.avatar;
    const level = user.userLevel?.level ? {
      level: user.userLevel.level.level,
      name: user.userLevel.level.name,
      icon: user.userLevel.level.icon,
    } : undefined;
    return {
      ...user,
      avatar,
      level,
    };
  });
};
