import api from './index';
import type { User, Post } from '../types';

export interface SearchResult {
  keyword: string;
  page: number;
  pageSize: number;
  users?: Array<User & { followerCount: number; postCount: number }>;
  posts?: Post[];
  usersPagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  postsPagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface QuickSearchUser {
  id: number;
  username: string;
  avatar: string | null;
  bio: string | null;
  followerCount: number;
  postCount: number;
}

/**
 * 全局搜索
 */
export const search = async (params: {
  q: string;
  type?: 'all' | 'users' | 'posts';
  page?: number;
  pageSize?: number;
}) => {
  const res = await api.get<{ success: boolean; data: SearchResult; message: string }>('/search', { params });
  return res.data.data;
};

/**
 * 快速搜索用户（自动补全）
 */
export const searchUsers = async (q: string, limit = 10) => {
  const res = await api.get<{ success: boolean; data: QuickSearchUser[] }>('/search/users', {
    params: { q, limit },
  });
  return res.data.data;
};

/**
 * 搜索动态
 */
export const searchPosts = async (params: {
  q: string;
  page?: number;
  pageSize?: number;
}) => {
  const res = await api.get<{ success: boolean; data: { data: Post[]; pagination: any } }>('/search/posts', { params });
  return res.data.data;
};