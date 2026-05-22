import fs from 'fs';
import path from 'path';
import prisma from '../services/db/prisma';
import { CreatePostRequest, UpdatePostRequest } from '../types';
import { addTagsToPost } from './tag.service';
import { updateTaskProgress } from './level.service';
import { cacheGet, cacheSet } from './cache';

/**
 * 热门帖子缓存键
 */
const POPULAR_POSTS_CACHE_KEY = 'popular:posts';

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
 * 处理用户等级信息
 */
const processUserLevel = (user: any) => {
  if (!user || !user.userLevel || !user.userLevel.level) {
    return user;
  }
  return {
    ...user,
    level: {
      level: user.userLevel.level.level,
      name: user.userLevel.level.name,
      icon: user.userLevel.level.icon,
    },
  };
};

/**
 * 敏感词配置文件路径
 */
const SENSITIVE_WORDS_CONFIG_PATH = path.join(__dirname, '../../config/sensitiveWords.json');

/**
 * 敏感词库缓存 - 使用 Set 实现 O(1) 查找
 */
let cachedSensitiveWords: Set<string> = new Set();
let lastLoadTime: number = 0;
let fileLastModified: number = 0;
const CACHE_TTL_MS = 60 * 1000; // 缓存有效期：60秒

/**
 * 加载敏感词配置（支持热更新）
 * - 缓存未过期时直接返回缓存，不检查文件
 * - 缓存过期时检查文件是否变化，变化则重新加载
 */
const loadSensitiveWords = (): Set<string> => {
  const now = Date.now();

  // 缓存未过期，直接返回缓存（避免每次都 statSync）
  if (cachedSensitiveWords.size > 0 && (now - lastLoadTime) < CACHE_TTL_MS) {
    return cachedSensitiveWords;
  }

  // 缓存过期或不存在，需要检查并重新加载
  try {
    const stats = fs.statSync(SENSITIVE_WORDS_CONFIG_PATH);

    // 文件未修改，使用旧缓存（即使已过期）
    if (stats.mtimeMs <= fileLastModified && cachedSensitiveWords.size > 0) {
      lastLoadTime = now; // 更新加载时间以避免频繁检查
      return cachedSensitiveWords;
    }

    // 文件已修改，重新加载
    const configData = fs.readFileSync(SENSITIVE_WORDS_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);
    const words = Array.isArray(config.sensitiveWords) ? config.sensitiveWords : [];

    // 使用 Set 存储敏感词，O(1) 查找性能
    cachedSensitiveWords = new Set(words);
    lastLoadTime = now;
    fileLastModified = stats.mtimeMs;
    console.log(`[SensitiveWords] Loaded ${cachedSensitiveWords.size} words`);
  } catch (error) {
    console.error('[SensitiveWords] Failed to load config:', error);
    // 加载失败时保留旧缓存
  }

  return cachedSensitiveWords;
};

/**
 * 检查文本是否包含敏感词
 * 使用 Set 进行 O(1) 查找，支持热更新
 */
const checkContent = (text: string): { valid: boolean; violations: string[] } => {
  const violations: string[] = [];
  const sensitiveWords = loadSensitiveWords();

  // 使用 Set.has() 进行 O(1) 查找
  for (const word of sensitiveWords) {
    // 使用单词边界匹配，避免误匹配
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
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
  const { content, images, address, latitude, longitude, isPrivate, tags } = data;

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
    select: {
      id: true,
      content: true,
      images: true,
      address: true,
      latitude: true,
      longitude: true,
      isPrivate: true,
      likeCount: true,
      favoriteCount: true,
      commentCount: true,
      createdAt: true,
      user: {
        select: { id: true, username: true, avatar: true, avatarData: true },
      },
    },
  });

  // 处理话题标签
  if (tags && Array.isArray(tags) && tags.length > 0) {
    await addTagsToPost(post.id, tags);
  }

  // 异步更新等级任务进度（发动态）
  setImmediate(async () => {
    try {
      const postCount = await prisma.post.count({
        where: { userId, isPrivate: false },
      });
      await updateTaskProgress(userId, 'post_count', postCount);
    } catch (error) {
      console.error('更新等级任务进度失败:', error);
    }
  });

  // 获取话题标签
  const postTags = await prisma.postTag.findMany({
    where: { postId: post.id },
    include: { tag: true },
  });

  return {
    ...post,
    user: processUserAvatar(post.user),
    images: parseImages(post.images),
    likeCount: typeof post.likeCount === 'number' ? post.likeCount : 0,
    favoriteCount: typeof post.favoriteCount === 'number' ? post.favoriteCount : 0,
    tags: postTags.map(pt => ({ id: pt.tag.id, name: pt.tag.name })),
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
          include: {
            userLevel: {
              include: {
                level: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    prisma.post.count({ where: { isPrivate: false } }),
  ]);

  let postData = posts.map((p: any) => {
    const processedUser = processUserLevel(processUserAvatar(p.user));
    return {
      ...p,
      user: processedUser,
      images: parseImages(p.images),
      likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
      favoriteCount: typeof p.favoriteCount === 'number' ? p.favoriteCount : 0,
      commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
      tags: p.tags?.map((pt: any) => ({ id: pt.tag.id, name: pt.tag.name })) || [],
      isLiked: false,
      isFavorited: false
    };
  });

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
        include: {
          userLevel: {
            include: {
              level: true,
            },
          },
        },
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

  // 获取话题标签
  const postTags = await prisma.postTag.findMany({
    where: { postId: post.id },
    include: { tag: true },
  });

  return {
    ...post,
    user: processUserLevel(processUserAvatar(post.user)),
    images: parseImages(post.images),
    likeCount: typeof post.likeCount === 'number' ? post.likeCount : 0,
    favoriteCount: typeof post.favoriteCount === 'number' ? post.favoriteCount : 0,
    commentCount: typeof post.commentCount === 'number' ? post.commentCount : 0,
    isLiked,
    isFavorited,
    tags: postTags.map(pt => ({ id: pt.tag.id, name: pt.tag.name })),
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

  // 检查是否被当前用户屏蔽
  if (currentUserId && !isOwner) {
    const block = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: currentUserId,
          blockedId: userId,
        },
      },
    });

    // 如果该用户被当前用户屏蔽，返回空结果
    if (block) {
      return {
        data: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  // 如果不是主人，只显示非私密动态
  const where = isOwner ? { userId } : { userId, isPrivate: false };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: {
            userLevel: {
              include: {
                level: true,
              },
            },
          },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  let postData = posts.map((p: any) => ({
    ...p,
    user: processUserLevel(processUserAvatar(p.user)),
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
 * 超级管理员和管理员可以删除任意动态，普通用户只能删除自己的动态
 */
export const deletePost = async (postId: number, userId: number, userRole?: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    throw new Error('动态不存在');
  }

  // 管理员和超级管理员可以删除任意动态
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  if (!isAdmin && post.userId !== userId) {
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

    // 异步更新等级任务进度（点赞）
    setImmediate(async () => {
      try {
        const likeCount = await prisma.like.count({ where: { userId } });
        await updateTaskProgress(userId, 'give_likes', likeCount);
      } catch (error) {
        console.error('更新等级任务进度失败:', error);
      }
    });

    return { liked: true, likeCount: post.likeCount + 1 };
  }
};

/**
 * 收藏 / 取消收藏
 * folderId: 可选，如果提供则收藏到指定文件夹
 */
export const toggleFavorite = async (userId: number, postId: number, folderId?: number | null) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('动态不存在');

  // 如果提供了 folderId，验证文件夹存在且属于该用户
  if (folderId !== undefined && folderId !== null) {
    const folder = await prisma.favoriteFolder.findFirst({
      where: { id: folderId, userId }
    });
    if (!folder) {
      throw new Error('文件夹不存在');
    }
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    // 取消收藏时，不管之前在哪个文件夹都删除
    await prisma.$transaction([
      prisma.favorite.delete({ where: { userId_postId: { userId, postId } } }),
      prisma.post.update({
        where: { id: postId },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);
    return { favorited: false, favoriteCount: post.favoriteCount - 1 };
  } else {
    // 收藏时，使用指定的 folderId 或 null
    await prisma.$transaction([
      prisma.favorite.create({ data: { userId, postId, folderId: folderId ?? null } }),
      prisma.post.update({
        where: { id: postId },
        data: { favoriteCount: { increment: 1 } },
      }),
    ]);

    // 异步更新等级任务进度（收藏）
    setImmediate(async () => {
      try {
        const favoriteCount = await prisma.favorite.count({ where: { userId } });
        await updateTaskProgress(userId, 'give_favorites', favoriteCount);
      } catch (error) {
        console.error('更新等级任务进度失败:', error);
      }
    });

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
  // category 参数实际上传入的是 folderId，使用 folderId 过滤
  if (category) {
    whereCondition.folderId = parseInt(category);
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
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                avatarData: true,
                userLevel: {
                  select: { level: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.favorite.count({ where: whereCondition }),
  ]);

  const posts = favorites.map((f: any) => ({
    ...f.post,
    user: processUserLevel(processUserAvatar(f.post.user)),
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
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                avatarData: true,
                userLevel: {
                  select: { level: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.like.count({ where: { userId } }),
  ]);

  const posts = likes.map((l: any) => ({
    ...l.post,
    user: processUserLevel(processUserAvatar(l.post.user)),
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

  console.log('🔍 getRandomPosts - allPosts count:', allPosts.length);

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

  console.log('🔍 getRandomPosts - selectedIds:', selectedIds);

  if (selectedIds.length === 0) {
    return { data: [] };
  }

  // 获取选中的动态详情
  const posts = await prisma.post.findMany({
    where: { id: { in: selectedIds } },
    include: {
      user: {
        include: {
          userLevel: {
            include: {
              level: true,
            },
          },
        },
      },
      tags: {
        include: {
          tag: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let postData = posts.map((p: any) => {
    const processedUser = processUserLevel(processUserAvatar(p.user));
    return {
      ...p,
      user: processedUser,
      images: parseImages(p.images),
      likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
      favoriteCount: typeof p.favoriteCount === 'number' ? p.favoriteCount : 0,
      commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
      isLiked: false,
      isFavorited: false,
      tags: p.tags?.map((pt: any) => ({ id: pt.tag.id, name: pt.tag.name })) || [],
    };
  });

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

/**
 * 获取热门帖子（带缓存，缓存5分钟）
 * 热门帖子根据点赞数、收藏数、评论数综合计算
 */
export const getPopularPosts = async (limit: number = 20, userId?: number) => {
  const cacheKey = `${POPULAR_POSTS_CACHE_KEY}:${limit}`;

  // Try to get from cache
  const cached = await cacheGet<any[]>(cacheKey);
  if (cached) {
    // 如果有用户ID，需要重新检查点赞和收藏状态
    if (userId) {
      const postIds = cached.map((p: any) => p.id);
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

      return cached.map((p: any) => ({
        ...p,
        isLiked: likedPostIds.has(p.id),
        isFavorited: favoritedPostIds.has(p.id),
      }));
    }
    return cached;
  }

  // 获取热门帖子：根据 (点赞数 * 3 + 收藏数 * 2 + 评论数) 排序
  const posts = await prisma.post.findMany({
    where: { isPrivate: false },
    include: {
      user: {
        include: {
          userLevel: {
            include: {
              level: true,
            },
          },
        },
      },
      tags: {
        include: {
          tag: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: {
      // 综合热度 = likeCount * 3 + favoriteCount * 2 + commentCount
      // 由于 Prisma 不支持计算表达式，我们先获取数据后在内存中排序
      createdAt: 'desc',
    },
    take: 100, // 先获取更多数据
  });

  // 计算综合热度并排序
  const postsWithScore = posts.map(p => ({
    ...p,
    score: (p.likeCount || 0) * 3 + (p.favoriteCount || 0) * 2 + (p.commentCount || 0),
  }));

  postsWithScore.sort((a, b) => b.score - a.score);
  const sortedPosts = postsWithScore.slice(0, limit);

  const postData = sortedPosts.map((p: any) => {
    const processedUser = processUserLevel(processUserAvatar(p.user));
    return {
      ...p,
      user: processedUser,
      images: parseImages(p.images),
      likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
      favoriteCount: typeof p.favoriteCount === 'number' ? p.favoriteCount : 0,
      commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
      isLiked: false,
      isFavorited: false,
      tags: p.tags?.map((pt: any) => ({ id: pt.tag.id, name: pt.tag.name })) || [],
    };
  });

  // 如果有用户ID，检查点赞和收藏状态
  if (userId) {
    const postIds = postData.map(p => p.id);
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

    const finalPostData = postData.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
      isFavorited: favoritedPostIds.has(p.id),
    }));

    // Cache for 5 minutes (without user-specific isLiked/isFavorited)
    await cacheSet(cacheKey, postData, 300);

    return finalPostData;
  }

  // Cache for 5 minutes
  await cacheSet(cacheKey, postData, 300);

  return postData;
};
