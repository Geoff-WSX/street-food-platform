import api from './index';
import type { User, ApiResponse } from '../types';

// 预设头像类型
export interface DefaultAvatar {
  id: string;
  emoji: string;
  name: string;
  url: string;
}

export const getMe = () =>
  api.get<ApiResponse<User>>('/users/me').then((r) => r.data.data);

export const getUserById = (id: number) =>
  api.get<ApiResponse<User>>(`/users/${id}`).then((r) => r.data.data);

export const updateProfile = (data: { username?: string; bio?: string }) =>
  api.put<ApiResponse<User>>('/users/me/profile', data).then((r) => r.data.data);

export const updateAvatar = (formData: FormData) =>
  api.put<ApiResponse<User>>('/users/me/avatar', formData).then((r) => r.data.data);

// 获取预设头像列表
export const getDefaultAvatars = () =>
  api.get<ApiResponse<DefaultAvatar[]>>('/users/avatars/defaults').then((r) => r.data.data);

// 设置预设头像
export const setDefaultAvatar = (avatarId: string) =>
  api.put<ApiResponse<User>>('/users/me/avatar/default', { avatarId }).then((r) => r.data.data);

export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  api.put('/users/me/password', { oldPassword: data.currentPassword, newPassword: data.newPassword }).then((r) => r.data);

// 更新私信设置
export const updateMessageSettings = (allowMessage: boolean, followOnlyMessage?: boolean) =>
  api.put<ApiResponse<User>>('/users/me/settings', { allowMessage, ...(followOnlyMessage !== undefined && { followOnlyMessage }) }).then((r) => r.data.data);

// 更新隐私设置
export const updatePrivacySettings = (data: { hideFollowing?: boolean; hideFollowers?: boolean; hidePosts?: boolean; hideFavorites?: boolean }) =>
  api.put<ApiResponse<User>>('/users/me/privacy', data).then((r) => r.data.data);

// 获取自定义头像列表
export interface CustomAvatar {
  id: string;
  url: string;
  createdAt: string;
}

export const getCustomAvatars = () =>
  api.get<ApiResponse<CustomAvatar[]>>('/users/me/avatars/customs').then((r) => r.data.data);

// 添加自定义头像
export const addCustomAvatar = (formData: FormData) =>
  api.put<ApiResponse<CustomAvatar>>('/users/me/avatars/customs', formData).then((r) => r.data.data);

// 删除自定义头像
export const deleteCustomAvatar = (avatarId: string) =>
  api.delete<ApiResponse<null>>(`/users/me/avatars/customs/${avatarId}`).then((r) => r.data.data);
