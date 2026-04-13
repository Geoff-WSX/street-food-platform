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
export const getPostsByTag = async (tagName: string, page: number = 1, pageSize: number = 10) => {
  const skip = (page - 1) * pageSize;
  const normalizedName = tagName.trim().toLowerCase().replace(/#/g, '');

  const tag = await prisma.tag.findUnique({
    where: { name: normalizedName },
  });

  if (!tag) {
    return { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
  }

  const [postTags, total] = await Promise.all([
    prisma.postTag.findMany({
      where: { tagId: tag.id },
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
    prisma.postTag.count({ where: { tagId: tag.id } }),
  ]);

  return {
    data: postTags.map(pt => ({
      ...pt.post,
      user: pt.post.user,
      images: pt.post.images ? JSON.parse(pt.post.images) : [],
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};