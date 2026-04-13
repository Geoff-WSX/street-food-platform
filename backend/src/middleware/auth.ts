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
