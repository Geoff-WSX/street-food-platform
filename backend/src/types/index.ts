import { Request } from 'express';

// 扩展 Express Request 类型，添加 user 属性
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role?: string;
  };
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 用户注册请求
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// 用户登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 更新用户资料请求
export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
}

// 修改密码请求
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// 创建动态请求
export interface CreatePostRequest {
  content: string;
  images: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  isPrivate?: boolean;
  tags?: string[];
}

// 更新动态请求
export interface UpdatePostRequest {
  content?: string;
  images?: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
}
