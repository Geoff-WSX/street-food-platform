import { Request, Response } from 'express';
import * as favoriteFolderService from '../services/favoriteFolder.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

/**
 * 获取用户收藏文件夹列表
 * GET /api/favorites/folders
 */
export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const folders = await favoriteFolderService.getUserFolders(userId);
    return successResponse(res, folders);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

/**
 * 创建收藏文件夹
 * POST /api/favorites/folders
 */
export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse(res, '文件夹名称不能为空', 'INVALID_NAME', 400);
    }

    if (name.length > 50) {
      return errorResponse(res, '文件夹名称不能超过50个字符', 'NAME_TOO_LONG', 400);
    }

    const folder = await favoriteFolderService.createFolder(userId, name.trim());
    return successResponse(res, folder, '文件夹创建成功', 201);
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

/**
 * 重命名收藏文件夹
 * PUT /api/favorites/folders/:id
 */
export const renameFolder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const folderId = parseInt(req.params.id);
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse(res, '文件夹名称不能为空', 'INVALID_NAME', 400);
    }

    if (name.length > 50) {
      return errorResponse(res, '文件夹名称不能超过50个字符', 'NAME_TOO_LONG', 400);
    }

    const folder = await favoriteFolderService.renameFolder(userId, folderId, name.trim());
    return successResponse(res, folder, '文件夹重命名成功');
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

/**
 * 删除收藏文件夹
 * DELETE /api/favorites/folders/:id
 */
export const deleteFolder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const folderId = parseInt(req.params.id);

    await favoriteFolderService.deleteFolder(userId, folderId);
    return successResponse(res, null, '文件夹删除成功');
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

/**
 * 设置默认收藏文件夹
 * PUT /api/favorites/folders/:id/default
 */
export const setDefaultFolder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const folderId = parseInt(req.params.id);

    await favoriteFolderService.setDefaultFolder(userId, folderId);
    return successResponse(res, null, '默认文件夹设置成功');
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};

/**
 * 取消默认文件夹
 * DELETE /api/favorites/folders/:id/default
 */
export const cancelDefaultFolder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    await favoriteFolderService.setDefaultFolder(userId, null);
    return successResponse(res, null, '已取消默认文件夹');
  } catch (error: any) {
    return errorResponse(res, error.message);
  }
};
