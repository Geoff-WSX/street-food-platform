import api from './index';
import type { ApiResponse, PaginatedPosts } from '../types';

export interface Friend {
  id: number;
  username: string;
  avatar?: string;
}

// 获取好友列表
export const getShareFriends = () =>
  api.get<ApiResponse<Friend[]>>('/share/friends').then((r) => r.data.data);

// 分享给好友
export const shareToFriend = (postId: number, friendId: number) =>
  api.post('/share/to-friend', { postId, friendId }).then((r) => r.data);

// 推荐动态
export const recommendPost = (postId: number) =>
  api.post('/share/recommend', { postId }).then((r) => r.data);

// 获取推荐动态
export const getRecommendedPosts = (params?: { page?: number; pageSize?: number }) =>
  api.get<ApiResponse<PaginatedPosts>>('/share/recommended', { params }).then((r) => r.data.data);

// 检查是否已推荐
export const checkRecommended = (postId: number) =>
  api.get<ApiResponse<boolean>>(`/share/check/${postId}`).then((r) => r.data.data);

// 删除推荐
export const deleteRecommend = (postId: number) =>
  api.delete(`/share/recommended/${postId}`).then((r) => r.data);
