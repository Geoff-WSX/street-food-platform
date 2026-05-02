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
    console.log('[DEBUG] Avatar upload request:', {
      hasFile: !!req.file,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : null,
      headers: req.headers['content-type'],
      bodyKeys: Object.keys(req.body)
    });

    if (!req.file) {
      console.log('[DEBUG] No file in request');
      return errorResponse(res, '请上传头像图片', 'NO_FILE');
    }

    // 将图片转换为 Base64 存储到数据库
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync(req.file.path);

    // 压缩图片
    const sharp = await import('sharp');
    const compressedImage = await sharp.default(imageBuffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toBuffer();

    // 转换为 Base64
    const base64Image = `data:image/webp;base64,${compressedImage.toString('base64')}`;

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    const user = await userService.updateAvatar(req.user!.userId, base64Image);
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
    const { allowMessage, followOnlyMessage } = req.body;
    const settings: { allowMessage?: boolean; followOnlyMessage?: boolean } = {};
    if (allowMessage !== undefined) settings.allowMessage = allowMessage;
    if (followOnlyMessage !== undefined) settings.followOnlyMessage = followOnlyMessage;
    const user = await userService.updateSettings(req.user!.userId, settings);
    return successResponse(res, user, '设置更新成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_SETTINGS_FAILED');
  }
};

// 更新隐私设置
export const updatePrivacySettings = async (req: AuthRequest, res: Response) => {
  try {
    const { hideFollowing, hideFollowers, hidePosts, hideFavorites } = req.body;
    const settings: { hideFollowing?: boolean; hideFollowers?: boolean; hidePosts?: boolean; hideFavorites?: boolean } = {};
    if (hideFollowing !== undefined) settings.hideFollowing = hideFollowing;
    if (hideFollowers !== undefined) settings.hideFollowers = hideFollowers;
    if (hidePosts !== undefined) settings.hidePosts = hidePosts;
    if (hideFavorites !== undefined) settings.hideFavorites = hideFavorites;
    const user = await userService.updateSettings(req.user!.userId, settings);
    return successResponse(res, user, '隐私设置更新成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_PRIVACY_SETTINGS_FAILED');
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

// 获取预设头像列表
export const getDefaultAvatars = async (req: AuthRequest, res: Response) => {
  try {
    const avatars = userService.getDefaultAvatars();
    return successResponse(res, avatars);
  } catch (error: any) {
    return errorResponse(res, error.message, 'GET_AVATARS_FAILED');
  }
};

// 设置预设头像
export const setDefaultAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const { avatarId } = req.body;
    if (!avatarId) {
      return errorResponse(res, '请选择头像', 'INVALID_PARAM');
    }
    const user = await userService.setDefaultAvatar(req.user!.userId, avatarId);
    return successResponse(res, user, '头像设置成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'SET_AVATAR_FAILED');
  }
};

// 获取自定义头像列表
export const getCustomAvatars = async (req: AuthRequest, res: Response) => {
  try {
    const avatars = await userService.getCustomAvatars(req.user!.userId);
    return successResponse(res, avatars);
  } catch (error: any) {
    return errorResponse(res, error.message, 'GET_CUSTOM_AVATARS_FAILED');
  }
};

// 添加自定义头像
export const addCustomAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return errorResponse(res, '请上传头像图片', 'NO_FILE');
    }

    // 将图片转换为 Base64
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync(req.file.path);

    // 压缩图片
    const sharp = await import('sharp');
    const compressedImage = await sharp.default(imageBuffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toBuffer();

    const base64Image = `data:image/webp;base64,${compressedImage.toString('base64')}`;

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    const avatar = await userService.addCustomAvatar(req.user!.userId, base64Image);
    return successResponse(res, avatar, '头像保存成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'ADD_CUSTOM_AVATAR_FAILED');
  }
};

// 删除自定义头像
export const deleteCustomAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const { avatarId } = req.params;
    if (!avatarId) {
      return errorResponse(res, '头像ID不能为空', 'INVALID_PARAM');
    }
    await userService.deleteCustomAvatar(req.user!.userId, avatarId);
    return successResponse(res, null, '头像删除成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'DELETE_CUSTOM_AVATAR_FAILED');
  }
};