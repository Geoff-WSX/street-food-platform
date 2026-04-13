import { PrismaClient } from '@prisma/client';

/**
 * 共享的 Prisma Client 实例
 * 避免在测试中创建多个连接导致资源泄漏
 */
let prismaInstance: PrismaClient | null = null;

/**
 * 获取共享的 Prisma Client 实例
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'test' ? [] : ['error'],
    });
  }
  return prismaInstance;
}

/**
 * 清理 Prisma Client 连接
 */
export async function cleanupPrismaClient(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

// 导出默认实例
export const prisma = getPrismaClient();
