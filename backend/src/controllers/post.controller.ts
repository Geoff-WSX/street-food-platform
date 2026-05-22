import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import * as postService from '../services/post.service';
import * as tagService from '../services/tag.service';
import { successResponse, errorResponse } from '../utils/response';
import { processPostImagesUpload } from '../middleware/upload';

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    let images: string[] = [];

    // 方式1: 通过 multipart/form-data 上传文件
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      const processedImages = await processPostImagesUpload(req.files as Express.Multer.File[]);
      images = processedImages.original;
    }
    // 方式2: 通过 JSON body 传递图片 URL 数组
    else if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      images = req.body.images;
    }
    // 两种方式都没有提供图片
    else {
      return errorResponse(res, '至少需要上传一张图片', 'NO_FILE');
    }

    const post = await postService.createPost(req.user!.userId, {
      ...req.body,
      images,
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
      isPrivate: req.body.isPrivate === 'true' || req.body.isPrivate === true,
    });

    return successResponse(res, post, '发布成功', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 'CREATE_FAILED');
  }
};

export const getPosts = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);
    const result = await postService.getPosts(page, pageSize, req.user?.userId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

export const getPostById = async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return errorResponse(res, '无效的动态ID', 'INVALID_PARAM');
    }
    const post = await postService.getPostById(postId, req.user?.userId);
    return successResponse(res, post);
  } catch (error: any) {
    return errorResponse(res, error.message, 'NOT_FOUND', 404);
  }
};

export const getUserPosts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return errorResponse(res, '无效的用户ID', 'INVALID_PARAM');
    }
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);

    // 如果不是查看自己的动态，需要过滤私密动态
    const currentUserId = req.user?.userId;
    const isOwner = currentUserId === userId;

    const result = await postService.getUserPosts(userId, page, pageSize, currentUserId, isOwner);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return errorResponse(res, '无效的动态ID', 'INVALID_PARAM');
    }

    // 处理图片压缩（如果有新图片上传）
    let processedData: { images?: string[] } = {};
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      const processedImages = await processPostImagesUpload(req.files as Express.Multer.File[]);
      processedData = {
        images: processedImages.original,
      };
    }

    const post = await postService.updatePost(postId, req.user!.userId, {
      ...req.body,
      ...processedData,
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
    });

    return successResponse(res, post, '更新成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_FAILED');
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return errorResponse(res, '无效的动态ID', 'INVALID_PARAM');
    }
    const result = await postService.deletePost(postId, req.user!.userId, req.user!.role);
    return successResponse(res, result, '删除成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'DELETE_FAILED');
  }
};

export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return errorResponse(res, '无效的动态ID', 'INVALID_PARAM');
    }
    const result = await postService.toggleLike(req.user!.userId, postId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'ACTION_FAILED');
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return errorResponse(res, '无效的动态ID', 'INVALID_PARAM');
    }
    const { folderId } = req.body;
    // folderId 可以是 null（收藏到根目录）或数字（收藏到指定文件夹）
    const result = await postService.toggleFavorite(req.user!.userId, postId, folderId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'ACTION_FAILED');
  }
};

export const getUserFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);
    const category = req.query.category as string | undefined;
    const result = await postService.getUserFavorites(req.user!.userId, page, pageSize, category);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

export const updateFavoriteSettings = async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return errorResponse(res, '无效的动态ID', 'INVALID_PARAM');
    }
    const { isPinned, category } = req.body;
    const result = await postService.updateFavoriteSettings(req.user!.userId, postId, { isPinned, category });
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'UPDATE_FAILED', 500);
  }
};

export const getFavoriteCategories = async (req: AuthRequest, res: Response) => {
  try {
    const result = await postService.getFavoriteCategories(req.user!.userId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

export const getUserLikes = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);
    const result = await postService.getUserLikes(req.user!.userId, page, pageSize);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

export const getRandomPosts = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const excludeIds = req.query.excludeIds ? (req.query.excludeIds as string).split(',').map(Number) : [];
    const result = await postService.getRandomPosts(limit, excludeIds, req.user?.userId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

export const getPostsByTagAndRegion = async (req: AuthRequest, res: Response) => {
  try {
    const tag = req.query.tag as string;
    const region = req.query.region as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);

    if (!tag) {
      return errorResponse(res, '请提供话题名称', 'INVALID_PARAM');
    }

    const result = await tagService.getPostsByTagAndRegion(tag, region || '', page, pageSize);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};

export const getPopularPosts = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await postService.getPopularPosts(limit, req.user?.userId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};
