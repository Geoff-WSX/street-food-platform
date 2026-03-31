import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * 全局搜索
 * 支持搜索用户和动态
 */
export const search = async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as string || 'all'; // all, users, posts
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    if (!query || query.trim().length < 1) {
      return errorResponse(res, '请输入搜索关键词', 'INVALID_QUERY', 400);
    }

    const keyword = query.trim();
    const skip = (page - 1) * pageSize;
    const result: any = {
      keyword,
      page,
      pageSize,
    };

    // 搜索用户
    if (type === 'all' || type === 'users') {
      const [users, totalUsers] = await Promise.all([
        prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: keyword } },
              { bio: { contains: keyword } },
            ],
            isActive: true,
          },
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            role: true,
            _count: {
              select: { followers: true, posts: true },
            },
          },
          take: type === 'users' ? pageSize : 5,
          skip: type === 'users' ? skip : 0,
          orderBy: [
            // 优先匹配用户名开头
            { username: 'asc' },
            { createdAt: 'desc' },
          ],
        }),
        prisma.user.count({
          where: {
            OR: [
              { username: { contains: keyword } },
              { bio: { contains: keyword } },
            ],
            isActive: true,
          },
        }),
      ]);

      result.users = users.map(user => ({
        ...user,
        followerCount: user._count.followers,
        postCount: user._count.posts,
        _count: undefined,
      }));
      result.usersPagination = {
        page: type === 'users' ? page : 1,
        pageSize: type === 'users' ? pageSize : 5,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / (type === 'users' ? pageSize : 5)),
      };
    }

    // 搜索动态
    if (type === 'all' || type === 'posts') {
      const [posts, totalPosts] = await Promise.all([
        prisma.post.findMany({
          where: {
            OR: [
              { content: { contains: keyword } },
              { address: { contains: keyword } },
            ],
            isPrivate: false, // 只搜索公开动态
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          take: pageSize,
          skip,
          orderBy: [
            // 按热度排序：点赞数 * 2 + 收藏数 + 评论数
            { likeCount: 'desc' },
            { createdAt: 'desc' },
          ],
        }),
        prisma.post.count({
          where: {
            OR: [
              { content: { contains: keyword } },
              { address: { contains: keyword } },
            ],
            isPrivate: false,
          },
        }),
      ]);

      result.posts = posts;
      result.postsPagination = {
        page,
        pageSize,
        total: totalPosts,
        totalPages: Math.ceil(totalPosts / pageSize),
      };
    }

    // 合并结果的分页信息（当 type=all 时）
    if (type === 'all') {
      result.pagination = {
        page,
        pageSize,
        total: result.usersPagination.total + result.postsPagination.total,
        totalPages: Math.ceil((result.usersPagination.total + result.postsPagination.total) / pageSize),
      };
    } else {
      result.pagination = type === 'users' ? result.usersPagination : result.postsPagination;
    }

    return successResponse(res, result);
  } catch (error: any) {
    console.error('搜索失败:', error);
    return errorResponse(res, error.message, 'SEARCH_FAILED', 500);
  }
};

/**
 * 搜索用户（仅用户名）
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);

    if (!query || query.trim().length < 2) {
      return errorResponse(res, '请输入至少2个字符', 'INVALID_QUERY', 400);
    }

    const keyword = query.trim();

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { startsWith: keyword } },
          { username: { contains: keyword } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        _count: {
          select: { followers: true, posts: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const result = users.map(user => ({
      ...user,
      followerCount: user._count.followers,
      postCount: user._count.posts,
      _count: undefined,
    }));

    return successResponse(res, result);
  } catch (error: any) {
    return errorResponse(res, error.message, 'SEARCH_FAILED', 500);
  }
};

/**
 * 搜索动态（仅内容）
 */
export const searchPosts = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    if (!query || query.trim().length < 1) {
      return errorResponse(res, '请输入搜索关键词', 'INVALID_QUERY', 400);
    }

    const keyword = query.trim();
    const skip = (page - 1) * pageSize;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          OR: [
            { content: { contains: keyword } },
            { address: { contains: keyword } },
          ],
          isPrivate: false,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        take: pageSize,
        skip,
        orderBy: [
          { likeCount: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.post.count({
        where: {
          OR: [
            { content: { contains: keyword } },
            { address: { contains: keyword } },
          ],
          isPrivate: false,
        },
      }),
    ]);

    return successResponse(res, {
      data: posts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    return errorResponse(res, error.message, 'SEARCH_FAILED', 500);
  }
};
