import { Response } from 'express';
import { AuthRequest } from '../types';
import * as userService from '../services/user.service';
import { successResponse, errorResponse } from '../utils/response';
import path from 'path';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.getUserById(req.user!.userId);
    return successResponse(res, user);
  } catch (error: any) {
    return errorResponse(res, error.message, 'NOT_FOUND', 404);
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }
    // 传入当前用户ID以检查关注状态
    const currentUserId = req.user?.userId;
    const user = await userService.getUserById(userId, currentUserId);
    return successResponse(res, user);
  } catch (error: any) {
    return errorResponse(res, error.message, 'NOT_FOUND', 404);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.updateProfile(req.user!.userId, req.body);
    return successResponse(res, user, '资料更新成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_FAILED');
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return errorResponse(res, '请上传头像图片', 'NO_FILE');
    }
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const user = await userService.updateAvatar(req.user!.userId, avatarPath);
    return successResponse(res, user, '头像更新成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_FAILED');
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const result = await userService.changePassword(req.user!.userId, req.body);
    return successResponse(res, result, '密码修改成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'CHANGE_PASSWORD_FAILED');
  }
};

// 更新用户设置
export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { allowMessage } = req.body;
    const user = await userService.updateSettings(req.user!.userId, { allowMessage });
    return successResponse(res, user, '设置更新成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_SETTINGS_FAILED');
  }
};

// 关注用户
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const followingId = parseInt(req.params.id);
    if (isNaN(followingId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    await userService.followUser(req.user!.userId, followingId);
    return successResponse(res, { success: true, followed: true }, '关注成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'FOLLOW_FAILED');
  }
};

// 取消关注
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const followingId = parseInt(req.params.id);
    if (isNaN(followingId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    await userService.unfollowUser(req.user!.userId, followingId);
    return successResponse(res, { success: true, followed: false }, '取消关注成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UNFOLLOW_FAILED');
  }
};

// 获取关注列表
export const getFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const currentUserId = req.user?.userId;
    const result = await userService.getFollowing(userId, { page, pageSize }, currentUserId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'NOT_FOUND', 404);
  }
};

// 获取粉丝列表
export const getFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const currentUserId = req.user?.userId;
    const result = await userService.getFollowers(userId, { page, pageSize }, currentUserId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'NOT_FOUND', 404);
  }
};

// 检查关注状态
export const getFollowStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    const result = await userService.getFollowStatus(req.user!.userId, userId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'NOT_FOUND', 404);
  }
};

// 拉黑用户
export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockedId = parseInt(req.params.id);
    if (isNaN(blockedId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    const result = await userService.blockUser(req.user!.userId, blockedId);
    return successResponse(res, result, '拉黑成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'BLOCK_FAILED');
  }
};

// 取消拉黑
export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockedId = parseInt(req.params.id);
    if (isNaN(blockedId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }

    const result = await userService.unblockUser(req.user!.userId, blockedId);
    return successResponse(res, result, '取消拉黑成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UNBLOCK_FAILED');
  }
};

// 获取黑名单
export const getBlockedUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await userService.getBlockedUsers(req.user!.userId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'NOT_FOUND', 404);
  }
};