import prisma from '../services/db/prisma';

/**
 * 创建或获取标签
 */
export const createOrGetTag = async (name: string) => {
  const normalizedName = name.trim().toLowerCase().replace(/#/g, '');

  let tag = await prisma.tag.findUnique({
    where: { name: normalizedName },
  });

  if (!tag) {
    tag = await prisma.tag.create({
      data: { name: normalizedName },
    });
  }

  return tag;
};

/**
 * 为帖子添加标签
 */
export const addTagsToPost = async (postId: number, tagNames: string[]) => {
  const tags = await Promise.all(
    tagNames.map(name => createOrGetTag(name))
  );

  await prisma.postTag.createMany({
    data: tags.map(tag => ({ postId, tagId: tag.id })),
    skipDuplicates: true,
  });

  return tags;
};

/**
 * 移除帖子的所有标签
 */
export const removeTagsFromPost = async (postId: number) => {
  await prisma.postTag.deleteMany({
    where: { postId },
  });
};

/**
 * 获取帖子的标签
 */
export const getPostTags = async (postId: number) => {
  const postTags = await prisma.postTag.findMany({
    where: { postId },
    include: { tag: true },
  });

  return postTags.map(pt => pt.tag);
};

/**
 * 获取热门标签
 */
export const getPopularTags = async (limit: number = 20) => {
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: {
      posts: { _count: 'desc' },
    },
    take: limit,
  });

  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    postCount: tag._count.posts,
  }));
};

/**
 * 根据标签获取帖子
 */
export const getPostsByTag = async (tagName: string, page: number = 1, pageSize: number = 10, random: boolean = false) => {
  const normalizedName = tagName.trim().toLowerCase().replace(/#/g, '');

  const tag = await prisma.tag.findUnique({
    where: { name: normalizedName },
  });

  if (!tag) {
    return { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
  }

  const skip = (page - 1) * pageSize;

  // 随机模式：从所有匹配的帖子中随机选取
  let postTags;
  if (random) {
    const allPostTags = await prisma.postTag.findMany({
      where: { tagId: tag.id },
      select: { postId: true },
    });

    if (allPostTags.length === 0) {
      return { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
    }

    // 随机打乱并选取 pageSize 个
    const shuffled = allPostTags.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, pageSize);
    const selectedIds = selected.map(pt => pt.postId);

    postTags = await prisma.postTag.findMany({
      where: { postId: { in: selectedIds } },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, avatar: true, avatarData: true } },
            tags: {
              include: { tag: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
  } else {
    const [pts, total] = await Promise.all([
      prisma.postTag.findMany({
        where: { tagId: tag.id },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: {
              user: { select: { id: true, username: true, avatar: true, avatarData: true } },
              tags: {
                include: { tag: { select: { id: true, name: true } } },
              },
            },
          },
        },
      }),
      prisma.postTag.count({ where: { tagId: tag.id } }),
    ]);
    postTags = pts;
  }

  return {
    data: postTags.map(pt => ({
      ...pt.post,
      user: pt.post.user,
      images: pt.post.images ? JSON.parse(pt.post.images) : [],
      tags: pt.post.tags?.map((pst: any) => ({ id: pst.tag.id, name: pst.tag.name })) || [],
    })),
    pagination: {
      page,
      pageSize,
      total: 0,
      totalPages: 0,
    },
  };
};

/**
 * 根据标签和地区获取帖子
 */
export const getPostsByTagAndRegion = async (
  tagName: string,
  region: string,
  page: number = 1,
  pageSize: number = 10
) => {
  const skip = (page - 1) * pageSize;
  const normalizedName = tagName.trim().toLowerCase().replace(/#/g, '');

  const tag = await prisma.tag.findUnique({
    where: { name: normalizedName },
  });

  if (!tag) {
    return { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
  }

  // 构建地址筛选条件
  const addressFilter = region ? { contains: region } : undefined;

  const whereCondition: any = { tagId: tag.id };
  if (addressFilter) {
    whereCondition.post = { address: addressFilter };
  }

  const [postTags, total] = await Promise.all([
    prisma.postTag.findMany({
      where: whereCondition,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: { select: { id: true, username: true, avatar: true, avatarData: true } },
            tags: {
              include: { tag: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma.postTag.count({ where: whereCondition }),
  ]);

  return {
    data: postTags.map(pt => ({
      ...pt.post,
      user: pt.post.user,
      images: pt.post.images ? JSON.parse(pt.post.images) : [],
      tags: pt.post.tags?.map((pst: any) => ({ id: pst.tag.id, name: pst.tag.name })) || [],
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};