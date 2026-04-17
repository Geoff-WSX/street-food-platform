import prisma from '../services/db/prisma';

/**
 * 获取用户的所有收藏文件夹
 */
export const getUserFolders = async (userId: number) => {
  return prisma.favoriteFolder.findMany({
    where: { userId },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' }
    ],
    include: {
      _count: {
        select: { favorites: true }
      }
    }
  });
};

/**
 * 创建收藏文件夹
 */
export const createFolder = async (userId: number, name: string) => {
  // 检查是否已存在同名文件夹
  const existing = await prisma.favoriteFolder.findUnique({
    where: {
      userId_name: { userId, name }
    }
  });

  if (existing) {
    throw new Error('文件夹名称已存在');
  }

  return prisma.favoriteFolder.create({
    data: { userId, name }
  });
};

/**
 * 重命名收藏文件夹
 */
export const renameFolder = async (userId: number, folderId: number, name: string) => {
  // 检查是否已存在同名文件夹
  const existing = await prisma.favoriteFolder.findFirst({
    where: {
      userId,
      name,
      NOT: { id: folderId }
    }
  });

  if (existing) {
    throw new Error('文件夹名称已存在');
  }

  return prisma.favoriteFolder.update({
    where: { id: folderId },
    data: { name }
  });
};

/**
 * 删除收藏文件夹
 * 删除后，该文件夹下的收藏会移动到"未分类"（folderId 为 null）
 */
export const deleteFolder = async (userId: number, folderId: number) => {
  // 检查文件夹是否存在且属于该用户
  const folder = await prisma.favoriteFolder.findFirst({
    where: { id: folderId, userId }
  });

  if (!folder) {
    throw new Error('文件夹不存在');
  }

  // 先将文件夹下的收藏移动到未分类
  await prisma.favorite.updateMany({
    where: { userId, folderId },
    data: { folderId: null }
  });

  // 删除文件夹
  return prisma.favoriteFolder.delete({
    where: { id: folderId }
  });
};

/**
 * 设置默认收藏文件夹
 */
export const setDefaultFolder = async (userId: number, folderId: number | null) => {
  // 先取消所有默认设置
  await prisma.favoriteFolder.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false }
  });

  // 如果设置了默认文件夹，则将其设为默认
  if (folderId !== null) {
    return prisma.favoriteFolder.update({
      where: { id: folderId },
      data: { isDefault: true }
    });
  }

  return null;
};

/**
 * 获取用户的默认收藏文件夹
 */
export const getDefaultFolder = async (userId: number) => {
  return prisma.favoriteFolder.findFirst({
    where: { userId, isDefault: true }
  });
};
