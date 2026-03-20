import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response';

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    return successResponse(res, result, '注册成功', 201);
  } catch (error: any) {
    return errorResponse(res, error.message, 'REGISTER_FAILED');
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    return successResponse(res, result, '登录成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'LOGIN_FAILED', 401);
  }
};
