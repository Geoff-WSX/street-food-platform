import prisma from '../services/db/prisma';

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
 * 分享动态给好友
 */
export const shareToFriend = async (userId: number, postId: number, friendId: number) => {
  // 不能分享给自己的动态
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error('动态不存在');
  }

  // 不能分享自己的动态给好友
  if (post.userId === userId) {
    throw new Error('不能分享自己的动态');
  }

  // 检查好友关系是否存在
  const friendships = await prisma.friendships.findMany({
    where: {
      OR: [
        { userId1: userId, userId2: friendId },
        { userId1: friendId, userId2: userId },
      ],
    },
  });

  if (friendships.length === 0) {
    throw new Error('你们还不是好友关系');
  }

  // 检查是否已经分享过
  const existingShare = await prisma.share.findFirst({
    where: {
      postId,
      userId,
      type: 'friend',
      friendId,
    },
  });

  if (existingShare) {
    throw new Error('已经分享过该动态给此好友');
  }

  const share = await prisma.share.create({
    data: {
      postId,
      userId,
      type: 'friend',
      friendId,
    },
    include: {
      post: {
        include: {
          user: {
            select: { id: true, username: true, avatar: true, avatarData: true },
          },
        },
      },
    },
  });

  return {
    ...share,
    post: {
      ...share.post,
      user: processUserAvatar(share.post.user),
      images: parseImages(share.post.images),
    },
  };
};

/**
 * 推荐动态到自己的主页
 */
export const recommendPost = async (userId: number, postId: number) => {
  // 检查动态是否存在
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error('动态不存在');
  }

  // 不能推荐自己的动态
  if (post.userId === userId) {
    throw new Error('不能推荐自己的动态');
  }

  // 检查是否已经推荐过
  const existingShare = await prisma.share.findFirst({
    where: {
      postId,
      userId,
      type: 'recommend',
    },
  });

  if (existingShare) {
    throw new Error('已经推荐过该动态');
  }

  const share = await prisma.share.create({
    data: {
      postId,
      userId,
      type: 'recommend',
    },
    include: {
      post: {
        include: {
          user: {
            select: { id: true, username: true, avatar: true, avatarData: true },
          },
          tags: {
            include: {
              tag: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  return {
    id: share.id,
    postId: share.postId,
    type: share.type,
    createdAt: share.createdAt,
    post: {
      ...share.post,
      user: processUserAvatar(share.post.user),
      images: parseImages(share.post.images),
      likeCount: typeof share.post.likeCount === 'number' ? share.post.likeCount : 0,
      favoriteCount: typeof share.post.favoriteCount === 'number' ? share.post.favoriteCount : 0,
      commentCount: typeof share.post.commentCount === 'number' ? share.post.commentCount : 0,
      tags: share.post.tags?.map((pt: any) => ({ id: pt.tag.id, name: pt.tag.name })) || [],
    },
  };
};

/**
 * 获取用户推荐的所有动态
 */
export const getRecommendedPosts = async (
  userId: number,
  page: number = 1,
  pageSize: number = 10
) => {
  const skip = (page - 1) * pageSize;

  const [shares, total] = await Promise.all([
    prisma.share.findMany({
      where: { userId, type: 'recommend' },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true, avatarData: true },
            },
            tags: {
              include: {
                tag: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.share.count({ where: { userId, type: 'recommend' } }),
  ]);

  const posts = shares.map((s: any) => ({
    ...s.post,
    user: processUserAvatar(s.post.user),
    images: parseImages(s.post.images),
    likeCount: typeof s.post.likeCount === 'number' ? s.post.likeCount : 0,
    favoriteCount: typeof s.post.favoriteCount === 'number' ? s.post.favoriteCount : 0,
    commentCount: typeof s.post.commentCount === 'number' ? s.post.commentCount : 0,
    isLiked: false,
    isFavorited: false,
    tags: s.post.tags?.map((pt: any) => ({ id: pt.tag.id, name: pt.tag.name })) || [],
    sharedAt: s.createdAt,
  }));

  // 获取当前用户的点赞和收藏状态
  if (posts.length > 0) {
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

    posts.forEach(p => {
      p.isLiked = likedPostIds.has(p.id);
      p.isFavorited = favoritedPostIds.has(p.id);
    });
  }

  return {
    data: posts,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 获取用户的好友列表（用于前端选择好友）
 */
export const getFriendsForShare = async (userId: number) => {
  const friendships = await prisma.friendships.findMany({
    where: {
      OR: [{ userId1: userId }, { userId2: userId }],
    },
    orderBy: { createdAt: 'desc' },
  });

  const friendIds = friendships.map(f =>
    f.userId1 === userId ? f.userId2 : f.userId1
  );

  if (friendIds.length === 0) {
    return [];
  }

  const friends = await prisma.user.findMany({
    where: { id: { in: friendIds } },
    select: { id: true, username: true, avatar: true, avatarData: true, bio: true },
    orderBy: { username: 'asc' },
  });

  return friends.map(f => processUserAvatar(f));
};

/**
 * 删除推荐记录
 */
export const deleteRecommend = async (userId: number, postId: number) => {
  const share = await prisma.share.findFirst({
    where: {
      userId,
      postId,
      type: 'recommend',
    },
  });

  if (!share) {
    throw new Error('推荐记录不存在');
  }

  await prisma.share.delete({
    where: { id: share.id },
  });

  return { success: true };
};
