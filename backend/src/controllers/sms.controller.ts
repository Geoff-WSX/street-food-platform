import { Request, Response } from 'express';
import { sendSmsCode } from '../services/sms.service';
import { SendSmsCodeRequest } from '../types';
import { successResponse } from '../utils/response';

/**
 * 发送短信验证码
 */
export const sendSms = async (req: Request, res: Response) => {
  const { phone } = req.body as SendSmsCodeRequest;

  if (!phone) {
    return res.status(400).json({ success: false, error: '手机号不能为空' });
  }

  const result = await sendSmsCode(phone);

  if (!result.success) {
    return res.status(400).json({ success: false, error: result.message });
  }

  return successResponse(res, { message: result.message }, '验证码已发送');
};
