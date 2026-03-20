import api from './index';
import type { User, ApiResponse } from '../types';

export const getMe = () =>
  api.get<ApiResponse<User>>('/users/me').then((r) => r.data.data);

export const getUserById = (id: number) =>
  api.get<ApiResponse<User>>(`/users/${id}`).then((r) => r.data.data);

export const updateProfile = (data: { username?: string; bio?: string }) =>
  api.put<ApiResponse<User>>('/users/me/profile', data).then((r) => r.data.data);

export const updateAvatar = (formData: FormData) =>
  api.put<ApiResponse<User>>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.data);

export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  api.put('/users/me/password', data).then((r) => r.data);
