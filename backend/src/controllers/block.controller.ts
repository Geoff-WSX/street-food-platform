import { Response } from 'express';
import { AuthRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import prisma from '../services/db/prisma';

// 拉黑用户
export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user!.userId;
    const { userId } = req.params;

    if (blockerId === parseInt(userId)) {
      return errorResponse(res, '不能拉黑自己', 'CANNOT_BLOCK_SELF');
    }

    const existing = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: parseInt(userId)
        }
      }
    });

    if (existing) {
      return errorResponse(res, '已经拉黑过了', 'ALREADY_BLOCKED');
    }

    const block = await prisma.block.create({
      data: {
        blockerId,
        blockedId: parseInt(userId)
      }
    });

    return successResponse(res, block, '拉黑成功');
  } catch (error: any) {
    console.error('拉黑失败:', error);
    return errorResponse(res, '拉黑失败', 'BLOCK_FAILED');
  }
};

// 取消拉黑
export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user!.userId;
    const { userId } = req.params;

    await prisma.block.deleteMany({
      where: {
        blockerId,
        blockedId: parseInt(userId)
      }
    });

    return successResponse(res, null, '取消拉黑成功');
  } catch (error: any) {
    console.error('取消拉黑失败:', error);
    return errorResponse(res, '取消拉黑失败', 'UNBLOCK_FAILED');
  }
};

// 获取黑名单
export const getBlockedList = async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user!.userId;

    const blocks = await prisma.block.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            avatar: true,
            avatarData: true,
            bio: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, blocks.map((b: any) => b.blocked));
  } catch (error: any) {
    console.error('获取黑名单失败:', error);
    return errorResponse(res, '获取黑名单失败', 'GET_BLOCKED_FAILED');
  }
};
