import api from './index';

export interface SystemStats {
  totalUsers: number;
  totalPosts: number;
  totalLikes: number;
  totalFavorites: number;
  activeUsers: number;
  newUsersToday: number;
  adminCount: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: string;
  isActive: boolean;
  allowMessage: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    posts: number;
    likes: number;
    favorites: number;
    followers: number;
    following: number;
  };
}

export interface UserListResponse {
  data: AdminUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 获取系统统计
export const getSystemStats = () => {
  return api.get<{ success: boolean; data: SystemStats; message: string }>('/admin/stats');
};

// 获取所有用户
export const getAllUsers = (params: { page?: number; pageSize?: number; keyword?: string; role?: string }) => {
  return api.get<{ success: boolean; data: UserListResponse; message: string }>('/admin/users', { params });
};

// 更新用户角色
export const updateUserRole = (userId: number, role: string) => {
  return api.put(`/admin/users/${userId}/role`, { role });
};

// 启用/禁用用户
export const toggleUserStatus = (userId: number) => {
  return api.put(`/admin/users/${userId}/status`);
};

// 重置用户密码
export const resetUserPassword = (userId: number, newPassword: string) => {
  return api.put(`/admin/users/${userId}/password`, { newPassword });
};

// 删除用户
export const deleteUser = (userId: number) => {
  return api.delete(`/admin/users/${userId}`);
};
