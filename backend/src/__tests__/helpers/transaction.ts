import { prisma } from './prisma';
import type { PrismaClient } from '@prisma/client';

/**
 * 在事务中执行测试
 * 如果测试失败，自动回滚
 */
export async function runInTransaction<T>(
  callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    return await callback(tx);
  });
}

/**
 * 创建测试用户（在事务中）
 */
export async function createTestUserInTransaction(tx: any, userData: any) {
  return await tx.user.create({
    data: userData,
  });
}

/**
 * 创建测试动态（在事务中）
 */
export async function createTestPostInTransaction(tx: any, postData: any) {
  return await tx.post.create({
    data: postData,
  });
}

/**
 * 清理事务数据
 */
export async function cleanupTransactionData(tx: any): Promise<void> {
  // 按依赖顺序删除
  await tx.commentLike.deleteMany({});
  await tx.mention.deleteMany({});
  await tx.comment.deleteMany({});
  await tx.like.deleteMany({});
  await tx.favorite.deleteMany({});
  await tx.postTag.deleteMany({});
  await tx.post.deleteMany({});
  await tx.follow.deleteMany({});
  await tx.notification.deleteMany({});
  await tx.user.deleteMany({
    where: {
      OR: [
        { email: { contains: 'test' } },
        { email: { contains: 'example.com' } },
        { username: { startsWith: 'testuser' } },
      ],
    },
  });
}
