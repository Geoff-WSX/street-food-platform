import { Response } from 'express';
import * as shareService from '../services/share.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

/**
 * 分享动态给好友
 * POST /api/share/to-friend
 */
export const shareToFriend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { postId, friendId } = req.body;

    if (!postId || typeof postId !== 'number') {
      return errorResponse(res, '无效的动态ID', 'INVALID_POST_ID', 400);
    }

    if (!friendId || typeof friendId !== 'number') {
      return errorResponse(res, '无效的好友ID', 'INVALID_FRIEND_ID', 400);
    }

    const result = await shareService.shareToFriend(userId, postId, friendId);
    return successResponse(res, result, '分享成功', 201);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

/**
 * 推荐动态到自己的主页
 * POST /api/share/recommend
 */
export const recommendPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { postId } = req.body;

    if (!postId || typeof postId !== 'number') {
      return errorResponse(res, '无效的动态ID', 'INVALID_POST_ID', 400);
    }

    const result = await shareService.recommendPost(userId, postId);
    return successResponse(res, result, '推荐成功', 201);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

/**
 * 获取推荐的所有动态
 * GET /api/share/recommended
 */
export const getRecommendedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const result = await shareService.getRecommendedPosts(userId, page, pageSize);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

/**
 * 获取好友列表（用于分享时选择好友）
 * GET /api/share/friends
 */
export const getFriendsForShare = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const friends = await shareService.getFriendsForShare(userId);
    return successResponse(res, friends);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

/**
 * 删除推荐记录
 * DELETE /api/share/recommended/:postId
 */
export const deleteRecommend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const postId = parseInt(req.params.postId);

    if (!postId || typeof postId !== 'number') {
      return errorResponse(res, '无效的动态ID', 'INVALID_POST_ID', 400);
    }

    await shareService.deleteRecommend(userId, postId);
    return successResponse(res, null, '已取消推荐');
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};
