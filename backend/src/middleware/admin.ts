import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { errorResponse } from '../utils/response';

/**
 * 审核员权限检查中间件（审核员和管理员都可以访问）
 */
export const requireReviewer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'reviewer' && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    return errorResponse(res, '需要审核员或管理员权限', 'REVIEWER_REQUIRED', 403);
  }
  next();
};

/**
 * 管理员权限检查中间件
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    return errorResponse(res, '需要管理员权限', 'ADMIN_REQUIRED', 403);
  }
  next();
};
