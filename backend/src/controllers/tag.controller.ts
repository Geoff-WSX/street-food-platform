import { Response } from 'express';
import { AuthRequest } from '../types';
import * as tagService from '../services/tag.service';
import { successResponse, errorResponse } from '../utils/response';

// 获取热门标签
export const getPopularTags = async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const tags = await tagService.getPopularTags(limit);
    return successResponse(res, tags);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取失败';
    return errorResponse(res, errorMessage, 'GET_TAGS_FAILED');
  }
};

// 根据标签获取帖子
export const getPostsByTag = async (req: AuthRequest, res: Response) => {
  try {
    const { tag } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);
    const random = req.query.random === 'true';

    if (!tag) {
      return errorResponse(res, '请提供标签名称', 'INVALID_PARAM');
    }

    const result = await tagService.getPostsByTag(tag, page, pageSize, random);
    return successResponse(res, result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取失败';
    return errorResponse(res, errorMessage, 'GET_POSTS_FAILED');
  }
};