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
    const user = await userService.getUserById(userId);
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
