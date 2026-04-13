import fs from 'fs';
import path from 'path';
import prisma from '../services/db/prisma';
import { CreatePostRequest, UpdatePostRequest } from '../types';

/**
 * 处理用户头像 - 优先使用 avatarData
 */
const processUserAvatar = (user: any) => {
  if (!user) return user;
  const avatar = user.avatarData || user.avatar;
  return {
    ...user,
    avatar,
  };
};

/**
 * 敏感词配置文件路径
 */
const SENSITIVE_WORDS_CONFIG_PATH = path.join(__dirname, '../../config/sensitiveWords.json');

/**
 * 敏感词库缓存
 */
let cachedSensitiveWords: string[] = [];
let lastLoadTime: number = 0;
const CACHE_TTL_MS = 60 * 1000; // 缓存有效期：60秒

/**
 * 加载敏感词配置（支持热更新）
 * - 缓存未过期时直接返回缓存
 * - 缓存过期或文件变化时重新加载
 */
const loadSensitiveWords = (): string[] => {
  const now = Date.now();

  // 缓存有效期检查
  if (cachedSensitiveWords.length > 0 && (now - lastLoadTime) < CACHE_TTL_MS) {
    // 检查文件是否被修改
    try {
      const stats = fs.statSync(SENSITIVE_WORDS_CONFIG_PATH);
      if (stats.mtimeMs <= lastLoadTime) {
        return cachedSensitiveWords;
      }
    } catch {
      // 文件不存在，使用缓存
      return cachedSensitiveWords;
    }
  }

  // 重新加载配置
  try {
    const configData = fs.readFileSync(SENSITIVE_WORDS_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);
    cachedSensitiveWords = Array.isArray(config.sensitiveWords) ? config.sensitiveWords : [];
    lastLoadTime = now;
    console.log(`[SensitiveWords] Loaded ${cachedSensitiveWords.length} words`);
  } catch (error) {
    console.error('[SensitiveWords] Failed to load config:', error);
    // 加载失败时保留旧缓存
  }

  return cachedSensitiveWords;
};

/**
 * 检查文本是否包含敏感词
 * 使用单词边界匹配，避免误匹配
 * 支持热更新：每次检查时重新加载配置
 */
const checkContent = (text: string): { valid: boolean; violations: string[] } => {
  const violations: string[] = [];
  const sensitiveWords = loadSensitiveWords();

  // 使用正则表达式进行全词匹配
  for (const word of sensitiveWords) {
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
};

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
 * 创建动态
 */
export const createPost = async (userId: number, data: CreatePostRequest) => {
  const { content, images, address, latitude, longitude, isPrivate } = data;

  if (!content || content.trim().length === 0) {
    throw new Error('动态内容不能为空');
  }

  // 文字审查
  const moderation = checkContent(content);
  if (!moderation.valid) {
    throw new Error(`内容包含违规词汇：${moderation.violations.join('、')}`);
  }

  if (!images || images.length === 0) {
    throw new Error('至少需要上传一张图片');
  }

  const post = await prisma.post.create({
    data: {
      userId,
      content: content.trim(),
      images: JSON.stringify(images),
      address,
      latitude,
      longitude,
      isPrivate: isPrivate || false,
    },
    include: {
      user: {
        select: { id: true, username: true, avatar: true, avatarData: true },
      },
    },
  });

  return {
    ...post,
    user: processUserAvatar(post.user),
    images: parseImages(post.images),
    likeCount: typeof post.likeCount === 'number' ? post.likeCount : 0,
    favoriteCount: typeof post.favoriteCount === 'number' ? post.favoriteCount : 0,
  };
};

/**
 * 获取动态列表（分页）
 */
export const getPosts = async (page: number = 1, pageSize: number = 10, userId?: number) => {
  const skip = (page - 1) * pageSize;

  // 基础查询条件
  const where: any = { isPrivate: false };

  // 获取当前用户屏蔽的用户列表
  if (userId) {
    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blockedUserIds = blocks.map(b => b.blockedId);
    if (blockedUserIds.length > 0) {
      where.userId = { notIn: blockedUserIds };
    }
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, avatar: true, avatarData: true },
        },
      },
    }),
    prisma.post.count({ where: { isPrivate: false } }),
  ]);

  let postData = posts.map((p: any) => ({
    ...p,
    user: processUserAvatar(p.user),
    images: parseImages(p.images),
    likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
    favoriteCount: typeof p.favoriteCount === 'number' ? p.favoriteCount : 0,
    commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
    isLiked: false,
    isFavorited: false
  }));

  if (userId) {
    const postIds = posts.map(p => p.id);
    const [likes, favorites] = await Promise.all([
      prisma.like.findMany({
        where: { userId, postId: { in: postIds } },
      }),
      prisma.favorite.findMany({
        where: { userId, postId: { in: postIds } },
      }),
    ]);

    const likedPostIds = new Set(likes.map(l => l.postId));
    const favoritedPostIds = new Set(favorites.map(f => f.postId));

    postData = postData.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
      isFavorited: favoritedPostIds.has(p.id),
    }));
  }

  return {
    data: postData,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取单个动态
 */
export const getPostById = async (postId: number, userId?: number) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: {
        select: { id: true, username: true, avatar: true, avatarData: true },
      },
    },
  });

  if (!post) {
    throw new Error('动态不存在');
  }

  let isLiked = false;
  let isFavorited = false;

  if (userId) {
    const [like, favorite] = await Promise.all([
      prisma.like.findUnique({ where: { userId_postId: { userId, postId } } }),
      prisma.favorite.findUnique({ where: { userId_postId: { userId, postId } } }),
    ]);
    isLiked = !!like;
    isFavorited = !!favorite;
  }

  return {
    ...post,
    user: processUserAvatar(post.user),
    images: parseImages(post.images),
    likeCount: typeof post.likeCount === 'number' ? post.likeCount : 0,
    favoriteCount: typeof post.favoriteCount === 'number' ? post.favoriteCount : 0,
    commentCount: typeof post.commentCount === 'number' ? post.commentCount : 0,
    isLiked,
    isFavorited,
  };
};

/**
 * 获取用户的动态列表
 */
export const getUserPosts = async (
  userId: number,
  page: number = 1,
  pageSize: number = 10,
  currentUserId?: number,
  isOwner: boolean = false
) => {
  const skip = (page - 1) * pageSize;

  // 如果不是主人，只显示非私密动态
  const where = isOwner ? { userId } : { userId, isPrivate: false };

  // 获取当前用户屏蔽的用户列表
  let blockedUserIds: number[] = [];
  if (currentUserId && !isOwner) {
    const blocks = await prisma.block.findMany({
      where: { blockerId: currentUserId },
      select: { blockedId: true },
    });
    blockedUserIds = blocks.map(b => b.blockedId);
    // 过滤掉被屏蔽用户的动态
    where.userId = {
      ...(where.userId as any),
      notIn: blockedUserIds,
    };
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, avatar: true, avatarData: true },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  let postData = posts.map((p: any) => ({
    ...p,
    user: processUserAvatar(p.user),
    images: parseImages(p.images),
    likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
    favoriteCount: typeof p.favoriteCount === 'number' ? p.favoriteCount : 0,
    commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
    isLiked: false,
    isFavorited: false
  }));

  if (currentUserId) {
    const postIds = posts.map(p => p.id);
    const [likes, favorites] = await Promise.all([
      prisma.like.findMany({
        where: { userId: currentUserId, postId: { in: postIds } },
      }),
      prisma.favorite.findMany({
        where: { userId: currentUserId, postId: { in: postIds } },
      }),
    ]);

    const likedPostIds = new Set(likes.map(l => l.postId));
    const favoritedPostIds = new Set(favorites.map(f => f.postId));

    postData = postData.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
      isFavorited: favoritedPostIds.has(p.id),
    }));
  }

  return {
    data: postData,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 更新动态
 */
export const updatePost = async (
  postId: number,
  userId: number,
  data: UpdatePostRequest
) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    throw new Error('动态不存在');
  }

  if (post.userId !== userId) {
    throw new Error('无权修改此动态');
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...(data.content && { content: data.content.trim() }),
      ...(data.images && { images: JSON.stringify(data.images) }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
    },
    include: {
      user: {
        select: { id: true, username: true, avatar: true, avatarData: true },
      },
    },
  });

  return {
    ...updated,
    user: processUserAvatar(updated.user),
    images: parseImages(updated.images),
    likeCount: typeof updated.likeCount === 'number' ? updated.likeCount : 0,
    favoriteCount: typeof updated.favoriteCount === 'number' ? updated.favoriteCount : 0,
  };
};

/**
 * 删除动态
 */
export const deletePost = async (postId: number, userId: number) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    throw new Error('动态不存在');
  }

  if (post.userId !== userId) {
    throw new Error('无权删除此动态');
  }

  await prisma.post.delete({ where: { id: postId } });
  return { message: '删除成功' };
};

/**
 * 点赞 / 取消点赞
 */
export const toggleLike = async (userId: number, postId: number) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('动态不存在');

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    // 取消点赞
    await prisma.$transaction([
      prisma.like.delete({ where: { userId_postId: { userId, postId } } }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    return { liked: false, likeCount: post.likeCount - 1 };
  } else {
    // 点赞
    await prisma.$transaction([
      prisma.like.create({ data: { userId, postId } }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    return { liked: true, likeCount: post.likeCount + 1 };
  }
};

/**
 * 收藏 / 取消收藏
 */
export const toggleFavorite = async (userId: number, postId: number) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('动态不存在');

  const existing = await prisma.favorite.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.favorite.delete({ where: { userId_postId: { userId, postId } } }),
      prisma.post.update({
        where: { id: postId },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);
    return { favorited: false, favoriteCount: post.favoriteCount - 1 };
  } else {
    await prisma.$transaction([
      prisma.favorite.create({ data: { userId, postId } }),
      prisma.post.update({
        where: { id: postId },
        data: { favoriteCount: { increment: 1 } },
      }),
    ]);
    return { favorited: true, favoriteCount: post.favoriteCount + 1 };
  }
};

/**
 * 获取用户收藏列表
 */
export const getUserFavorites = async (
  userId: number,
  page: number = 1,
  pageSize: number = 10,
  category?: string
) => {
  const skip = (page - 1) * pageSize;

  const whereCondition: any = { userId };
  if (category) {
    whereCondition.category = category;
  }

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where: whereCondition,
      skip,
      take: pageSize,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, avatar: true, avatarData: true } },
          },
        },
      },
    }),
    prisma.favorite.count({ where: whereCondition }),
  ]);

  const posts = favorites.map((f: any) => ({
    ...f.post,
    user: processUserAvatar(f.post.user),
    images: parseImages(f.post.images),
    likeCount: typeof f.post.likeCount === 'number' ? f.post.likeCount : 0,
    favoriteCount: typeof f.post.favoriteCount === 'number' ? f.post.favoriteCount : 0,
    isFavorited: true,
    isPinned: f.isPinned,
    category: f.category,
  }));

  const postIds = posts.map(p => p.id);
  const likes = await prisma.like.findMany({
    where: { userId, postId: { in: postIds } },
  });
  const likedPostIds = new Set(likes.map(l => l.postId));

  return {
    data: posts.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 更新收藏设置（置顶、分类）
 */
export const updateFavoriteSettings = async (
  userId: number,
  postId: number,
  data: { isPinned?: boolean; category?: string | null }
) => {
  const favorite = await prisma.favorite.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (!favorite) {
    throw new Error('收藏不存在');
  }

  const updated = await prisma.favorite.update({
    where: { userId_postId: { userId, postId } },
    data: {
      ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
      ...(data.category !== undefined && { category: data.category }),
    },
  });

  return updated;
};

/**
 * 获取用户收藏分类列表
 */
export const getFavoriteCategories = async (userId: number) => {
  const categories = await prisma.favorite.findMany({
    where: { userId, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
  });

  return categories.map(c => c.category).filter(Boolean) as string[];
};

/**
 * 获取用户点赞的动态列表
 */
export const getUserLikes = async (
  userId: number,
  page: number = 1,
  pageSize: number = 10
) => {
  const skip = (page - 1) * pageSize;

  const [likes, total] = await Promise.all([
    prisma.like.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, avatar: true, avatarData: true } },
          },
        },
      },
    }),
    prisma.like.count({ where: { userId } }),
  ]);

  const posts = likes.map((l: any) => ({
    ...l.post,
    user: processUserAvatar(l.post.user),
    images: parseImages(l.post.images),
    likeCount: typeof l.post.likeCount === 'number' ? l.post.likeCount : 0,
    favoriteCount: typeof l.post.favoriteCount === 'number' ? l.post.favoriteCount : 0,
    isLiked: true,
  }));

  const postIds = posts.map(p => p.id);
  const favorites = await prisma.favorite.findMany({
    where: { userId, postId: { in: postIds } },
  });
  const favoritedPostIds = new Set(favorites.map(f => f.postId));

  return {
    data: posts.map(p => ({
      ...p,
      isFavorited: favoritedPostIds.has(p.id),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取随机推荐的动态
 */
export const getRandomPosts = async (
  limit: number = 20,
  excludeIds: number[] = [],
  userId?: number
) => {
  // 获取所有非私密的动态ID（排除已显示的）
  const where: any = {
    isPrivate: false,
    ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
  };

  const allPosts = await prisma.post.findMany({
    where,
    select: { id: true },
  });

  const availableIds = allPosts.map(p => p.id);

  // 随机选择指定数量的ID
  const selectedIds: number[] = [];
  const count = Math.min(limit, availableIds.length);

  while (selectedIds.length < count && availableIds.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableIds.length);
    const selectedId = availableIds[randomIndex];
    selectedIds.push(selectedId);
    // 从可用列表中移除已选择的
    availableIds.splice(randomIndex, 1);
  }

  if (selectedIds.length === 0) {
    return { data: [] };
  }

  // 获取选中的动态详情
  const posts = await prisma.post.findMany({
    where: { id: { in: selectedIds } },
    include: {
      user: {
        select: { id: true, username: true, avatar: true, avatarData: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let postData = posts.map((p: any) => ({
    ...p,
    user: processUserAvatar(p.user),
    images: parseImages(p.images),
    likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
    favoriteCount: typeof p.favoriteCount === 'number' ? p.favoriteCount : 0,
    commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
    isLiked: false,
    isFavorited: false
  }));

  if (userId) {
    const postIds = posts.map(p => p.id);
    const [likes, favorites] = await Promise.all([
      prisma.like.findMany({
        where: { userId, postId: { in: postIds } },
      }),
      prisma.favorite.findMany({
        where: { userId, postId: { in: postIds } },
      }),
    ]);

    const likedPostIds = new Set(likes.map(l => l.postId));
    const favoritedPostIds = new Set(favorites.map(f => f.postId));

    postData = postData.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
      isFavorited: favoritedPostIds.has(p.id),
    }));
  }

  return { data: postData };
};
