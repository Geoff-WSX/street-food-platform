import { Response } from 'express';
import { AuthRequest } from '../types';
import * as topicService from '../services/topic.service';
import { successResponse, errorResponse } from '../utils/response';

/**
 * 创建话题
 * POST /api/topics
 */
export const createTopic = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return errorResponse(res, '用户未登录', 'UNAUTHORIZED', 401);
    }

    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse(res, '请提供话题名称', 'INVALID_PARAM');
    }

    const result = await topicService.createTopic(name);
    return successResponse(res, result, '话题创建成功');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '创建失败';
    const code = error instanceof Error && error.message === '话题已存在' ? 'TOPIC_EXISTS' : 'CREATE_TOPIC_FAILED';
    const statusCode = error instanceof Error && error.message === '话题已存在' ? 409 : 400;
    return errorResponse(res, errorMessage, code, statusCode);
  }
};

/**
 * 获取热门话题排行榜
 * GET /api/topics
 */
export const getPopularTopics = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    const result = await topicService.getPopularTopics(page, pageSize);
    return successResponse(res, result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取失败';
    return errorResponse(res, errorMessage, 'GET_TOPICS_FAILED');
  }
};

// GET /api/topics/:name/posts - 获取话题下的动态
export const getTopicPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);
    const userId = req.user?.userId;

    if (!name) {
      return errorResponse(res, '请提供话题名称', 'INVALID_PARAM');
    }

    const result = await topicService.getTopicPosts(decodeURIComponent(name), page, pageSize, userId);
    return successResponse(res, result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取失败';
    return errorResponse(res, errorMessage, 'GET_TOPIC_POSTS_FAILED');
  }
};

/**
 * 获取话题详情
 * GET /api/topics/:name
 */
export const getTopicDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);
    const userId = req.user?.userId;

    if (!name) {
      return errorResponse(res, '请提供话题名称', 'INVALID_PARAM');
    }

    // 获取话题基本信息
    const topic = await topicService.getTopicByName(decodeURIComponent(name), userId);

    if (!topic) {
      return errorResponse(res, '话题不存在', 'TOPIC_NOT_FOUND', 404);
    }

    // 获取话题下的动态列表
    const posts = await topicService.getTopicPosts(decodeURIComponent(name), page, pageSize, userId);

    return successResponse(res, {
      ...topic,
      posts: posts.data,
      pagination: posts.pagination,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取失败';
    return errorResponse(res, errorMessage, 'GET_TOPIC_FAILED');
  }
};

/**
 * 关注话题
 * POST /api/topics/:id/follow
 */
export const followTopic = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return errorResponse(res, '用户未登录', 'UNAUTHORIZED', 401);
    }

    const tagId = parseInt(id);
    if (isNaN(tagId)) {
      return errorResponse(res, '无效的话题ID', 'INVALID_PARAM');
    }

    const result = await topicService.followTopic(userId, tagId);
    return successResponse(res, result, '关注成功');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '关注失败';
    const code = error instanceof Error && error.message === '话题不存在' ? 'TOPIC_NOT_FOUND' : 'FOLLOW_FAILED';
    const statusCode = error instanceof Error && error.message === '话题不存在' ? 404 : 400;
    return errorResponse(res, errorMessage, code, statusCode);
  }
};

/**
 * 取消关注话题
 * DELETE /api/topics/:id/follow
 */
export const unfollowTopic = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return errorResponse(res, '用户未登录', 'UNAUTHORIZED', 401);
    }

    const tagId = parseInt(id);
    if (isNaN(tagId)) {
      return errorResponse(res, '无效的话题ID', 'INVALID_PARAM');
    }

    const result = await topicService.unfollowTopic(userId, tagId);
    return successResponse(res, result, '取消关注成功');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '取消关注失败';
    const code = error instanceof Error && error.message === '话题不存在' ? 'TOPIC_NOT_FOUND' : 'UNFOLLOW_FAILED';
    const statusCode = error instanceof Error && error.message === '话题不存在' ? 404 : 400;
    return errorResponse(res, errorMessage, code, statusCode);
  }
};

/**
 * 获取用户关注的话题列表
 * GET /api/topics/following
 */
export const getUserFollowedTopics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return errorResponse(res, '用户未登录', 'UNAUTHORIZED', 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    const result = await topicService.getUserFollowedTopics(userId, page, pageSize);
    return successResponse(res, result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取失败';
    return errorResponse(res, errorMessage, 'GET_FOLLOWED_TOPICS_FAILED');
  }
};

/**
 * 批量检查话题关注状态
 * GET /api/topics/check-follow
 */
export const checkTopicFollowStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return errorResponse(res, '用户未登录', 'UNAUTHORIZED', 401);
    }

    const tagIds = req.query.ids as string;
    if (!tagIds) {
      return errorResponse(res, '请提供话题ID列表', 'INVALID_PARAM');
    }

    const tagIdList = tagIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (tagIdList.length === 0) {
      return errorResponse(res, '无效的话题ID列表', 'INVALID_PARAM');
    }

    const result = await topicService.checkTopicFollowStatus(userId, tagIdList);
    return successResponse(res, result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '获取失败';
    return errorResponse(res, errorMessage, 'CHECK_FOLLOW_STATUS_FAILED');
  }
};

/**
 * 搜索话题
 * GET /api/topics/search
 */
export const searchTopics = async (req: AuthRequest, res: Response) => {
  try {
    const keyword = req.query.keyword as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (!keyword || keyword.trim().length === 0) {
      return successResponse(res, [], '请输入搜索关键词');
    }

    const result = await topicService.searchTopics(keyword, limit);
    return successResponse(res, result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '搜索失败';
    return errorResponse(res, errorMessage, 'SEARCH_TOPICS_FAILED');
  }
};
