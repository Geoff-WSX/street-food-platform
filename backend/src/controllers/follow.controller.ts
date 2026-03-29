import { Response } from 'express';
import { AuthRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import prisma from '../config/database';

// 关注用户
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.user!.userId;
    const { userId } = req.params;

    if (followerId === parseInt(userId)) {
      return errorResponse(res, '不能关注自己', 'CANNOT_FOLLOW_SELF');
    }

    // 检查是否已关注
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: parseInt(userId)
        }
      }
    });

    if (existing) {
      return errorResponse(res, '已经关注过了', 'ALREADY_FOLLOWING');
    }

    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId: parseInt(userId)
      }
    });

    return successResponse(res, follow, '关注成功');
  } catch (error: any) {
    console.error('关注失败:', error);
    return errorResponse(res, '关注失败', 'FOLLOW_FAILED');
  }
};

// 取消关注
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.user!.userId;
    const { userId } = req.params;

    await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId: parseInt(userId)
      }
    });

    return successResponse(res, null, '取消关注成功');
  } catch (error: any) {
    console.error('取消关注失败:', error);
    return errorResponse(res, '取消关注失败', 'UNFOLLOW_FAILED');
  }
};

// 获取关注列表
export const getFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, following.map((f: any) => f.following));
  } catch (error: any) {
    console.error('获取关注列表失败:', error);
    return errorResponse(res, '获取关注列表失败', 'GET_FOLLOWING_FAILED');
  }
};

// 获取粉丝列表
export const getFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(res, followers.map((f: any) => f.follower));
  } catch (error: any) {
    console.error('获取粉丝列表失败:', error);
    return errorResponse(res, '获取粉丝列表失败', 'GET_FOLLOWERS_FAILED');
  }
};

// 检查是否关注
export const checkFollowStatus = async (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.user!.userId;
    const { userId } = req.params;

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: parseInt(userId)
        }
      }
    });

    return successResponse(res, {
      isFollowing: !!follow
    });
  } catch (error: any) {
    console.error('检查关注状态失败:', error);
    return errorResponse(res, '检查关注状态失败', 'CHECK_FOLLOW_FAILED');
  }
};
