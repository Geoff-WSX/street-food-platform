import { Response } from 'express';
import { AuthRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import * as friendService from '../services/friend.service';

// 发送好友请求
export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.userId;
    const { userId } = req.params;
    const { message } = req.body;

    const result = await friendService.sendFriendRequest(
      senderId,
      parseInt(userId),
      message
    );

    const msg = (result as any).autoAccepted
      ? '对方已向你发送好友请求，已自动成为好友'
      : '好友请求已发送';

    return successResponse(res, result, msg);
  } catch (error: any) {
    console.error('发送好友请求失败:', error);
    return errorResponse(res, error.message || '发送好友请求失败', 'SEND_REQUEST_FAILED');
  }
};

// 获取收到的好友请求
export const getReceivedRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const requests = await friendService.getReceivedRequests(userId);
    return successResponse(res, requests);
  } catch (error: any) {
    console.error('获取好友请求失败:', error);
    return errorResponse(res, '获取好友请求失败', 'GET_REQUESTS_FAILED');
  }
};

// 获取发出的好友请求
export const getSentRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const requests = await friendService.getSentRequests(userId);
    return successResponse(res, requests);
  } catch (error: any) {
    console.error('获取发出的请求失败:', error);
    return errorResponse(res, '获取发出的请求失败', 'GET_SENT_REQUESTS_FAILED');
  }
};

// 接受好友请求
export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    const result = await friendService.acceptFriendRequest(parseInt(requestId), userId);
    return successResponse(res, result, '已成为好友');
  } catch (error: any) {
    console.error('接受好友请求失败:', error);
    return errorResponse(res, error.message || '接受好友请求失败', 'ACCEPT_REQUEST_FAILED');
  }
};

// 拒绝好友请求
export const rejectFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    await friendService.rejectFriendRequest(parseInt(requestId), userId);
    return successResponse(res, null, '已拒绝好友请求');
  } catch (error: any) {
    console.error('拒绝好友请求失败:', error);
    return errorResponse(res, error.message || '拒绝好友请求失败', 'REJECT_REQUEST_FAILED');
  }
};

// 取消好友请求
export const cancelFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    await friendService.cancelFriendRequest(parseInt(requestId), userId);
    return successResponse(res, null, '已取消好友请求');
  } catch (error: any) {
    console.error('取消好友请求失败:', error);
    return errorResponse(res, error.message || '取消好友请求失败', 'CANCEL_REQUEST_FAILED');
  }
};

// 获取好友列表
export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { page = 1, pageSize = 20, search } = req.query;

    const result = await friendService.getFriends(
      userId,
      parseInt(page as string),
      parseInt(pageSize as string),
      search as string
    );

    return successResponse(res, result);
  } catch (error: any) {
    console.error('获取好友列表失败:', error);
    return errorResponse(res, '获取好友列表失败', 'GET_FRIENDS_FAILED');
  }
};

// 获取好友数量
export const getFriendsCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = await friendService.getFriendsCount(userId);
    return successResponse(res, { count });
  } catch (error: any) {
    console.error('获取好友数量失败:', error);
    return errorResponse(res, '获取好友数量失败', 'GET_FRIENDS_COUNT_FAILED');
  }
};

// 检查是否为好友
export const checkFriendship = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { targetId } = req.params;

    const result = await friendService.checkFriendship(userId, parseInt(targetId));
    return successResponse(res, result);
  } catch (error: any) {
    console.error('检查好友关系失败:', error);
    return errorResponse(res, '检查好友关系失败', 'CHECK_FRIENDSHIP_FAILED');
  }
};

// 删除好友
export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { friendId } = req.params;

    await friendService.removeFriend(userId, parseInt(friendId));
    return successResponse(res, null, '已删除好友');
  } catch (error: any) {
    console.error('删除好友失败:', error);
    return errorResponse(res, error.message || '删除好友失败', 'REMOVE_FRIEND_FAILED');
  }
};

// 获取好友推荐
export const getFriendRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { limit = 10 } = req.query;

    const recommendations = await friendService.getFriendRecommendations(
      userId,
      parseInt(limit as string)
    );

    return successResponse(res, recommendations);
  } catch (error: any) {
    console.error('获取好友推荐失败:', error);
    return errorResponse(res, '获取好友推荐失败', 'GET_RECOMMENDATIONS_FAILED');
  }
};