import { Request, Response } from 'express';
import { phoneRegister, phoneLogin } from '../services/auth.service';
import { PhoneRegisterRequest, PhoneLoginRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { recordLoginSuccess, recordLoginFailure } from '../middleware/security';

/**
 * 手机号注册
 */
export const phoneRegisterController = async (req: Request, res: Response) => {
  try {
    const data = req.body as PhoneRegisterRequest;
    const result = await phoneRegister(data);
    return successResponse(res, result, '注册成功');
  } catch (error: any) {
    return errorResponse(res, error.message, 'PHONE_REGISTER_ERROR');
  }
};

/**
 * 手机号登录
 */
export const phoneLoginController = async (req: Request, res: Response) => {
  try {
    const data = req.body as PhoneLoginRequest;
    const result = await phoneLogin(data);
    recordLoginSuccess(req);
    return successResponse(res, result, '登录成功');
  } catch (error: any) {
    recordLoginFailure(req);
    return errorResponse(res, error.message, 'PHONE_LOGIN_ERROR');
  }
};
