import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Prisma 错误处理
  if (err.code === 'P2002') {
    return errorResponse(res, '该字段已存在，请使用其他值', 'DUPLICATE_FIELD', 400);
  }

  if (err.code === 'P2025') {
    return errorResponse(res, '未找到相关记录', 'NOT_FOUND', 404);
  }

  // 默认错误
  return errorResponse(
    res,
    err.message || '服务器内部错误',
    'INTERNAL_ERROR',
    err.statusCode || 500
  );
};

/**
 * 404 处理中间件
 */
export const notFoundHandler = (req: Request, res: Response) => {
  return errorResponse(res, '请求的资源不存在', 'NOT_FOUND', 404);
};
