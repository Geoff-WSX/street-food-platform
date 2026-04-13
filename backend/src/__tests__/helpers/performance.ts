/**
 * 性能优化工具
 * 使用并行操作提升测试执行速度
 */

import { prisma } from './prisma';

/**
 * 并行创建多个测试用户
 */
export async function createTestUsersInParallel(count: number, userDataGenerator: (index: number) => any) {
  const userPromises = Array.from({ length: count }, (_, i) =>
    prisma.user.create({ data: userDataGenerator(i) })
  );
  return await Promise.all(userPromises);
}

/**
 * 并行创建多个测试动态
 */
export async function createTestPostsInParallel(userId: number, count: number, postDataGenerator: (index: number) => any) {
  const postPromises = Array.from({ length: count }, (_, i) =>
    prisma.post.create({ data: { ...postDataGenerator(i), userId } })
  );
  return await Promise.all(postPromises);
}

/**
 * 并行创建多个测试评论
 */
export async function createTestCommentsInParallel(posts: any[], count: number, commentDataGenerator: (index: number) => any) {
  const commentPromises = Array.from({ length: count }, (_, i) => {
    const post = posts[i % posts.length];
    return prisma.comment.create({
      data: { ...commentDataGenerator(i), postId: post.id, userId: post.userId }
    });
  });
  return await Promise.all(commentPromises);
}

/**
 * 并行执行关注操作
 */
export async function followUsersInParallel(followerId: number, userIds: number[], authenticatedRequest: any) {
  const followPromises = userIds.map(userId =>
    authenticatedRequest.post(`/api/users/${userId}/follow`)
  );
  return await Promise.all(followPromises);
}

/**
 * 批量清理数据（使用并行删除）
 */
export async function cleanupDataInParallel() {
  await Promise.all([
    prisma.commentLike.deleteMany({}),
    prisma.mention.deleteMany({}),
    prisma.comment.deleteMany({}),
    prisma.like.deleteMany({}),
    prisma.favorite.deleteMany({}),
    prisma.postTag.deleteMany({}),
  ]);
  await Promise.all([
    prisma.post.deleteMany({}),
    prisma.follow.deleteMany({}),
    prisma.notification.deleteMany({}),
  ]);
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: 'test' } },
        { email: { contains: 'example.com' } },
        { username: { startsWith: 'testuser' } },
      ],
    },
  });
}
