import { Request, Response } from 'express';
import { generateCaptcha } from '../services/captcha.service';
import { successResponse } from '../utils/response';

/**
 * 获取验证码
 */
export const getCaptcha = (req: Request, res: Response) => {
  const captcha = generateCaptcha();
  return successResponse(res, captcha, '验证码生成成功');
};
