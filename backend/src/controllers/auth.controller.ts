import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { addToBlacklist } from '../utils/jwtBlacklist';
import { recordLoginSuccess, recordLoginFailure } from '../middleware/security';

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
    recordLoginSuccess(req);
    return successResponse(res, result, '登录成功');
  } catch (error: any) {
    recordLoginFailure(req);
    return errorResponse(res, error.message, 'LOGIN_FAILED', 401);
  }
};

/**
 * 微信小程序登录
 * POST /api/auth/wx-login
 */
export const wxLogin = async (req: Request, res: Response) => {
  try {
    const { code, userInfo } = req.body;

    if (!code) {
      return errorResponse(res, '缺少登录凭证', 'MISSING_CODE', 400);
    }

    const result = await authService.wxLogin(code, userInfo);
    return successResponse(res, result, '登录成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'WX_LOGIN_FAILED', 500);
  }
};

/**
 * 用户登出
 * POST /api/auth/logout
 * 将当前 token 加入黑名单
 */
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // 获取当前 token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, '未提供认证令牌', 'NO_TOKEN', 400);
    }

    const token = authHeader.substring(7);

    // 将 token 加入黑名单（7天后过期，与JWT过期时间一致）
    const expiresIn = 7 * 24 * 60 * 60; // 7天（秒）
    addToBlacklist(token, expiresIn);

    return successResponse(res, null, '登出成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'LOGOUT_FAILED', 500);
  }
};

/**
 * 刷新令牌
 * POST /api/auth/refresh
 * 获取新的访问令牌
 */
export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    // TODO: 实现令牌刷新逻辑
    // 可以使用更长期的 refresh token 来获取新的 access token
    return errorResponse(res, '令牌刷新功能待实现', 'NOT_IMPLEMENTED', 501);
  } catch (error: any) {
    return errorResponse(res, error.message, 'REFRESH_FAILED', 500);
  }
};
