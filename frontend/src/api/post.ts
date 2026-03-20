import api from './index';
import type { Post, PaginatedPosts, ApiResponse } from '../types';

export const getPosts = (params?: { page?: number; pageSize?: number }) =>
  api.get<ApiResponse<PaginatedPosts>>('/posts', { params }).then((r) => r.data.data);

export const getPost = (id: number) =>
  api.get<ApiResponse<Post>>(`/posts/${id}`).then((r) => r.data.data);

export const getUserPosts = (userId: number, params?: { page?: number; pageSize?: number }) =>
  api.get<ApiResponse<PaginatedPosts>>(`/posts/user/${userId}`, { params }).then((r) => r.data.data);

export const getUserFavorites = (params?: { page?: number; pageSize?: number }) =>
  api.get<ApiResponse<PaginatedPosts>>('/posts/favorites', { params }).then((r) => r.data.data);

export const createPost = (formData: FormData) =>
  api.post<ApiResponse<Post>>('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.data);

export const deletePost = (id: number) =>
  api.delete(`/posts/${id}`).then((r) => r.data);

export const toggleLike = (id: number) =>
  api.post<ApiResponse<{ liked: boolean; likeCount: number }>>(`/posts/${id}/like`).then((r) => r.data.data);

export const toggleFavorite = (id: number) =>
  api.post<ApiResponse<{ favorited: boolean; favoriteCount: number }>>(`/posts/${id}/favorite`).then((r) => r.data.data);
