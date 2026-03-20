import api from './index';
import type { AuthData, ApiResponse } from '../types';

export const register = (data: {
  username: string;
  email: string;
  password: string;
}) => api.post<ApiResponse<AuthData>>('/auth/register', data).then((r) => r.data.data);

export const login = (data: { email: string; password: string }) =>
  api.post<ApiResponse<AuthData>>('/auth/login', data).then((r) => r.data.data);
