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

export const getCaptcha = () =>
  api.get<ApiResponse<CaptchaData>>('/captcha').then((r) => r.data.data);

export interface LoginData {
  email: string;
  password: string;
  captchaId: string;
  captchaCode: string;
  trustedDeviceToken?: string;
  trustDevice?: boolean;
}

export const login = (data: LoginData) =>
  api.post<ApiResponse<AuthData>>('/auth/login', data).then((r) => r.data.data);
