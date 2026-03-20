import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import * as postService from '../services/post.service';
import { successResponse, errorResponse } from '../utils/response';

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return errorResponse(res, '至少需要上传一张图片', 'NO_FILE');
    }

    const images = (req.files as Express.Multer.File[]).map(
      (f) => `/uploads/posts/${f.filename}`
    );

    const post = await postService.createPost(req.user!.userId, {
      ...req.body,
      images,
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
    });

    return successResponse(res, post, '发布成功', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 'CREATE_FAILED');
  }
};

export const getPosts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);
    const result = await postService.getPosts(page, pageSize);
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
    const result = await postService.getUserPosts(userId, page, pageSize);
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

    const images = req.files
      ? (req.files as Express.Multer.File[]).map((f) => `/uploads/posts/${f.filename}`)
      : undefined;

    const post = await postService.updatePost(postId, req.user!.userId, {
      ...req.body,
      ...(images && { images }),
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
    const result = await postService.deletePost(postId, req.user!.userId);
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
    const result = await postService.toggleFavorite(req.user!.userId, postId);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'ACTION_FAILED');
  }
};

export const getUserFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);
    const result = await postService.getUserFavorites(req.user!.userId, page, pageSize);
    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'FETCH_FAILED', 500);
  }
};
