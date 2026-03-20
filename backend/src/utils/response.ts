import { Response } from 'express';
import { ApiResponse } from '../types';

/**
 * 统一成功响应
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  message: string = '操作成功',
  statusCode: number = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(response);
};

/**
 * 统一错误响应
 */
export const errorResponse = (
  res: Response,
  error: string,
  code: string = 'ERROR',
  statusCode: number = 400
) => {
  const response: ApiResponse = {
    success: false,
    error,
    code,
  };
  return res.status(statusCode).json(response);
};
