import prisma from '../config/database';
import { CreatePostRequest, UpdatePostRequest } from '../types';

/**
 * 创建动态
 */
export const createPost = async (userId: number, data: CreatePostRequest) => {
  const { content, images, address, latitude, longitude } = data;

  if (!content || content.trim().length === 0) {
    throw new Error('动态内容不能为空');
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
    },
    include: {
      user: {
        select: { id: true, username: true, avatar: true },
      },
    },
  });

  return {
    ...post,
    images: JSON.parse(post.images),
  };
};

/**
 * 获取动态列表（分页）
 */
export const getPosts = async (page: number = 1, pageSize: number = 10) => {
  const skip = (page - 1) * pageSize;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    }),
    prisma.post.count(),
  ]);

  return {
    data: posts.map((p: any) => ({ ...p, images: JSON.parse(p.images) })),
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
        select: { id: true, username: true, avatar: true },
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
    images: JSON.parse(post.images),
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
  pageSize: number = 10
) => {
  const skip = (page - 1) * pageSize;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    }),
    prisma.post.count({ where: { userId } }),
  ]);

  return {
    data: posts.map((p: any) => ({ ...p, images: JSON.parse(p.images) })),
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
        select: { id: true, username: true, avatar: true },
      },
    },
  });

  return { ...updated, images: JSON.parse(updated.images) };
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
  pageSize: number = 10
) => {
  const skip = (page - 1) * pageSize;

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    }),
    prisma.favorite.count({ where: { userId } }),
  ]);

  return {
    data: favorites.map((f: any) => ({
      ...f.post,
      images: JSON.parse(f.post.images),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};
