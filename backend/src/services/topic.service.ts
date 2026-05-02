import prisma from '../services/db/prisma';

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
 * 创建话题
 */
export const createTopic = async (name: string) => {
  // 标准化话题名称：trim, lowercase
  const normalizedName = name.trim().toLowerCase().replace(/#/g, '');

  if (normalizedName.length === 0) {
    throw new Error('话题名称不能为空');
  }

  if (normalizedName.length > 50) {
    throw new Error('话题名称不能超过50个字符');
  }

  // 检查话题是否已存在
  const existingTag = await prisma.tag.findUnique({
    where: { name: normalizedName },
  });

  if (existingTag) {
    throw new Error('话题已存在');
  }

  // 创建话题
  const tag = await prisma.tag.create({
    data: {
      name: normalizedName,
    },
    include: {
      _count: {
        select: { posts: true, follows: true },
      },
    },
  });

  return {
    id: tag.id,
    name: tag.name,
    icon: tag.icon || null,
    postCount: tag._count.posts,
    followCount: tag._count.follows,
  };
};

/**
 * 获取热门话题排行榜
 * 按动态数量和关注数综合排序
 */
export const getPopularTopics = async (page: number = 1, pageSize: number = 20) => {
  const skip = (page - 1) * pageSize;

  // 获取话题列表，包含动态数量和关注数
  const [topics, total] = await Promise.all([
    prisma.tag.findMany({
      include: {
        _count: {
          select: { posts: true, follows: true },
        },
      },
      orderBy: [
        // 按动态数量降序
        { posts: { _count: 'desc' } },
        // 按关注数降序
        { follows: { _count: 'desc' } },
      ],
      skip,
      take: pageSize,
    }),
    prisma.tag.count(),
  ]);

  return {
    data: topics.map(topic => ({
      id: topic.id,
      name: topic.name,
      icon: topic.icon || null,
      postCount: topic._count.posts,
      followCount: topic._count.follows,
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
 * 获取话题详情
 */
export const getTopicByName = async (tagName: string, userId?: number) => {
  const normalizedName = tagName.trim().toLowerCase().replace(/#/g, '');

  const tag = await prisma.tag.findUnique({
    where: { name: normalizedName },
    include: {
      _count: {
        select: { posts: true, follows: true },
      },
    },
  });

  if (!tag) {
    return null;
  }

  let isFollowing = false;
  if (userId) {
    const follow = await prisma.topicFollow.findUnique({
      where: { userId_tagId: { userId, tagId: tag.id } },
    });
    isFollowing = !!follow;
  }

  return {
    id: tag.id,
    name: tag.name,
    icon: tag.icon || null,
    postCount: tag._count.posts,
    followCount: tag._count.follows,
    isFollowing,
  };
};

/**
 * 获取话题下的动态列表
 */
export const getTopicPosts = async (
  tagName: string,
  page: number = 1,
  pageSize: number = 10,
  userId?: number
) => {
  const normalizedName = tagName.trim().toLowerCase().replace(/#/g, '');

  const tag = await prisma.tag.findUnique({
    where: { name: normalizedName },
  });

  if (!tag) {
    return { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
  }

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

  // 获取该话题下的所有动态ID
  const postTagIds = await prisma.postTag.findMany({
    where: { tagId: tag.id },
    select: { postId: true },
  });

  const postIds = postTagIds.map(pt => pt.postId);

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: {
        ...where,
        id: { in: postIds },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.post.count({
      where: {
        ...where,
        id: { in: postIds },
      },
    }),
  ]);

  let postData = posts.map((p: any) => ({
    ...p,
    user: processUserAvatar(p.user),
    images: parseImages(p.images),
    likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
    favoriteCount: typeof p.favoriteCount === 'number' ? p.favoriteCount : 0,
    commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
    tags: p.tags?.map((pt: any) => ({ id: pt.tag.id, name: pt.tag.name })) || [],
    isLiked: false,
    isFavorited: false,
  }));

  if (userId) {
    const postIdsList = posts.map(p => p.id);
    const [likes, favorites] = await Promise.all([
      prisma.like.findMany({
        where: { userId, postId: { in: postIdsList } },
      }),
      prisma.favorite.findMany({
        where: { userId, postId: { in: postIdsList } },
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
 * 关注话题
 */
export const followTopic = async (userId: number, tagId: number) => {
  // 检查话题是否存在
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
  });

  if (!tag) {
    throw new Error('话题不存在');
  }

  // 检查是否已关注
  const existing = await prisma.topicFollow.findUnique({
    where: { userId_tagId: { userId, tagId } },
  });

  if (existing) {
    throw new Error('已关注该话题');
  }

  // 创建关注关系
  await prisma.topicFollow.create({
    data: { userId, tagId },
  });

  // 获取更新后的关注数
  const followCount = await prisma.topicFollow.count({
    where: { tagId },
  });

  return { following: true, followCount };
};

/**
 * 取消关注话题
 */
export const unfollowTopic = async (userId: number, tagId: number) => {
  // 检查话题是否存在
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
  });

  if (!tag) {
    throw new Error('话题不存在');
  }

  // 检查是否已关注
  const existing = await prisma.topicFollow.findUnique({
    where: { userId_tagId: { userId, tagId } },
  });

  if (!existing) {
    throw new Error('未关注该话题');
  }

  // 删除关注关系
  await prisma.topicFollow.delete({
    where: { userId_tagId: { userId, tagId } },
  });

  // 获取更新后的关注数
  const followCount = await prisma.topicFollow.count({
    where: { tagId },
  });

  return { following: false, followCount };
};

/**
 * 获取用户关注的话题列表
 */
export const getUserFollowedTopics = async (userId: number, page: number = 1, pageSize: number = 20) => {
  const skip = (page - 1) * pageSize;

  const [follows, total] = await Promise.all([
    prisma.topicFollow.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        tag: {
          include: {
            _count: {
              select: { posts: true, follows: true },
            },
          },
        },
      },
    }),
    prisma.topicFollow.count({ where: { userId } }),
  ]);

  return {
    data: follows.map(f => ({
      id: f.tag.id,
      name: f.tag.name,
      icon: f.tag.icon || null,
      postCount: f.tag._count.posts,
      followCount: f.tag._count.follows,
      followedAt: f.createdAt,
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
 * 检查用户是否关注了指定话题
 */
export const checkTopicFollowStatus = async (userId: number, tagIds: number[]) => {
  const follows = await prisma.topicFollow.findMany({
    where: {
      userId,
      tagId: { in: tagIds },
    },
    select: { tagId: true },
  });

  return tagIds.map(tagId => ({
    tagId,
    isFollowed: follows.some(f => f.tagId === tagId),
  }));
};

/**
 * 搜索话题
 */
export const searchTopics = async (keyword: string, limit: number = 20) => {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (normalizedKeyword.length === 0) {
    return [];
  }

  const topics = await prisma.tag.findMany({
    where: {
      name: {
        contains: normalizedKeyword,
      },
    },
    include: {
      _count: {
        select: { posts: true, follows: true },
      },
    },
    take: limit,
    orderBy: {
      posts: {
        _count: 'desc',
      },
    },
  });

  return topics.map(topic => ({
    id: topic.id,
    name: topic.name,
    icon: topic.icon || null,
    postCount: topic._count.posts,
    followCount: topic._count.follows,
  }));
};
