import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import prisma from '../services/db/prisma';

/**
 * JWT 鉴权中间件
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 从 header 中获取 token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, '未提供认证令牌', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

    // 验证 token
    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse(res, '无效或过期的认证令牌', 'INVALID_TOKEN', 401);
    }

    // 检查用户是否存在且处于活跃状态
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true, role: true }
    });

    if (!user) {
      return errorResponse(res, '用户不存在', 'USER_NOT_FOUND', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, '账号已被禁用，请联系管理员', 'ACCOUNT_DISABLED', 403);
    }

    // 将用户信息附加到请求对象
    req.user = { ...decoded, role: user.role };
    next();
  } catch (error) {
    return errorResponse(res, '认证失败', 'AUTH_ERROR', 401);
  }
};

/**
 * 等级权限中间件
 * 检查用户等级是否达到最低要求
 * 注意：admin、reviewer、super_admin 不受等级限制
 */
export const requireLevel = (minLevel: number) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return errorResponse(res, '未登录', 'UNAUTHORIZED', 401);
      }

      // 非普通用户（admin、reviewer、super_admin）不受等级限制
      if (req.user.role && req.user.role !== 'user') {
        return next();
      }

      // 获取用户等级信息
      let userLevel = await prisma.userLevel.findUnique({
        where: { userId: req.user.userId },
        include: { level: true },
      });

      // 如果没有等级记录，自动初始化
      if (!userLevel) {
        // 查找Lv1等级
        const level1 = await prisma.level.findUnique({
          where: { level: 1 },
        });

        if (!level1) {
          return errorResponse(res, '等级数据未初始化', 'LEVEL_ERROR', 500);
        }

        // 创建用户等级记录
        await prisma.userLevel.create({
          data: {
            userId: req.user.userId,
            levelId: level1.id,
            exp: 0,
          },
        });

        // 重新获取
        userLevel = await prisma.userLevel.findUnique({
          where: { userId: req.user.userId },
          include: { level: true },
        });
      }

      if (!userLevel || !userLevel.level) {
        return errorResponse(res, '用户等级信息获取失败', 'LEVEL_ERROR', 500);
      }

      if (userLevel.level.level < minLevel) {
        return errorResponse(
          res,
          `该功能需要达到 Lv${minLevel} ${getLevelName(minLevel)}，当前等级为 Lv${userLevel.level.level} ${userLevel.level.name}`,
          'LEVEL_REQUIRED',
          403
        );
      }

      next();
    } catch (error) {
      return errorResponse(res, '等级校验失败', 'LEVEL_ERROR', 500);
    }
  };
};

/**
 * 获取等级名称
 */
const getLevelName = (level: number): string => {
  const names: Record<number, string> = {
    1: '美食新手',
    2: '美食学徒',
    3: '美食达人',
    4: '美食专家',
    5: '美食大师',
    6: '美食传奇',
  };
  return names[level] || '';
};

/**
 * 可选的 JWT 鉴权中间件
 * 如果提供了 token 则验证，没有 token 也可以继续
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 从 header 中获取 token
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

      // 验证 token
      const decoded = verifyToken(token);

      if (decoded) {
        // 检查用户是否处于活跃状态
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, isActive: true, role: true }
        });

        if (user && user.isActive) {
          // 将用户信息附加到请求对象
          req.user = { ...decoded, role: user.role };
        }
      }
    }

    next();
  } catch (error) {
    // 忽略错误，继续处理请求
    next();
  }
};
