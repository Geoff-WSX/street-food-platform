import api from './index';
import type { Post, PaginatedPosts, ApiResponse } from '../types';

export const getPosts = (params?: { page?: number; pageSize?: number }) =>
  api.get<ApiResponse<PaginatedPosts>>('/posts', { params }).then((r) => r.data.data);

export const getPost = (id: number) =>
  api.get<ApiResponse<Post>>(`/posts/${id}`).then((r) => r.data.data);

export const getUserPosts = (userId: number, params?: { page?: number; pageSize?: number }) => {
  console.log('🔍 getUserPosts API 调用:', { userId, params });
  return api.get<ApiResponse<PaginatedPosts>>(`/posts/user/${userId}`, { params })
    .then((r) => {
      // 详细日志 - 打印前3条数据的结构
      const posts = r.data.data?.data || [];
      const first3 = posts.slice(0, 3).map((p) => ({
        postId: p.id,
        userId: p.user?.id,
        username: p.user?.username
      }));
      console.log('🔍 getUserPosts 响应详情:', {
        url: r.config.url,
        dataStructure: typeof r.data.data,
        hasData: !!r.data.data?.data,
        hasPagination: !!r.data.data?.pagination,
        first3PostUserIds: first3,
        totalPosts: posts.length
      });
      return r.data.data as PaginatedPosts;
    });
};

export const getUserFavorites = (params?: { page?: number; pageSize?: number; category?: string }) =>
  api.get<ApiResponse<PaginatedPosts>>('/posts/favorites', { params }).then((r) => r.data.data);

export const getFavoriteCategories = () =>
  api.get<ApiResponse<string[]>>('/posts/favorites/categories').then((r) => r.data.data);

export const updateFavoriteSettings = (postId: number, data: { isPinned?: boolean; category?: string | null }) =>
  api.put<ApiResponse<{ isPinned: boolean; category: string | null }>>(`/posts/${postId}/favorite`, data).then((r) => r.data.data);

export const createPost = (formData: FormData) =>
  api.post<ApiResponse<Post>>('/posts', formData).then((r) => r.data.data);

export const deletePost = (id: number) =>
  api.delete(`/posts/${id}`).then((r) => r.data);

export const toggleLike = (id: number) =>
  api.post<ApiResponse<{ liked: boolean; likeCount: number }>>(`/posts/${id}/like`).then((r) => r.data.data);

export const toggleFavorite = (id: number, folderId?: number | null) =>
  api.post<ApiResponse<{ favorited: boolean; favoriteCount: number }>>(`/posts/${id}/favorite`, { folderId }).then((r) => r.data.data);

export const getAddressByLocation = (lat: number, lng: number) =>
  api.get<ApiResponse<{ address: string }>>('/posts/address/location', { params: { lat, lng } }).then((r) => r.data.data);

export const getRandomPosts = (params?: { limit?: number; excludeIds?: string }) =>
  api.get<ApiResponse<{ data: Post[] }>>('/posts/random', { params }).then((r) => r.data.data?.data || []);

// 标签相关 API
export const getPopularTags = (limit?: number) =>
  api.get<ApiResponse<{ id: number; name: string; postCount: number }[]>>('/tags/popular', { params: { limit } }).then((r) => r.data.data);

export const getPostsByTag = (tag: string, params?: { page?: number; pageSize?: number; random?: boolean }) =>
  api.get<ApiResponse<PaginatedPosts>>(`/tags/${tag}/posts`, { params }).then((r) => r.data.data);

export const getPostsByTagAndRegion = (tag: string, region?: string, params?: { page?: number; pageSize?: number }) =>
  api.get<ApiResponse<PaginatedPosts>>('/posts/by-tag-and-region', { params: { tag, region, ...params } }).then((r) => r.data.data);
