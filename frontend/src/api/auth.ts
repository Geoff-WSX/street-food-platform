import api from './index';
import type { AuthData, ApiResponse } from '../types';

export const register = (data: {
  username: string;
  email: string;
  password: string;
}) => api.post<ApiResponse<AuthData>>('/auth/register', data).then((r) => r.data.data);

export interface CaptchaData {
  id: string;
  data: string;
}

export const getCaptcha = () => {
  return api.get<ApiResponse<CaptchaData>>('/captcha')
    .then((r) => r.data.data)
    .catch((err) => {
      console.error('[API] getCaptcha 错误:', err.message);
      throw err;
    });
};

export interface LoginData {
  email: string;
  password: string;
  captchaId: string;
  captchaCode: string;
}

export const login = (data: LoginData) =>
  api.post<ApiResponse<AuthData>>('/auth/login', data).then((r) => r.data.data);

// 手机号登录
export interface PhoneLoginData {
  phone: string;
  password: string;
  smsCode: string;
}

export const phoneLogin = (data: PhoneLoginData) =>
  api.post<ApiResponse<AuthData>>('/auth/phone-login', data).then((r) => r.data.data);

// 手机号注册
export interface PhoneRegisterData {
  username: string;
  phone: string;
  password: string;
  smsCode: string;
}

export const phoneRegister = (data: PhoneRegisterData) =>
  api.post<ApiResponse<AuthData>>('/auth/phone-register', data).then((r) => r.data.data);

// 发送短信验证码
export const sendSmsCode = (phone: string) =>
  api.post<ApiResponse<{ message: string }>>('/sms/send', { phone }).then((r) => r.data.data);
