import api from './index';
import type { PaginatedPosts, ApiResponse } from '../types';

// 话题分类
export interface TopicCategory {
  id: number;
  name: string;
  icon: string;
  count: number;
}

// 话题信息
export interface Topic {
  id: number;
  name: string;
  icon?: string;
  description?: string;
  postCount: number;
  followCount?: number;
  isFollowing?: boolean;
}

// 话题排行榜项
export interface TopicRankingItem {
  id: number;
  name: string;
  icon?: string;
  description?: string;
  postCount: number;
  followCount?: number;
  isFollowing?: boolean;
}

// 获取热门话题排行 - 调用 GET /topics 并处理返回数据
export const getHotTopics = (params?: { limit?: number; category?: string }) =>
  api.get<ApiResponse<{ data: TopicRankingItem[]; pagination: { total: number } }>>('/topics', { params })
    .then((r) => r.data.data.data);

// 获取话题分类 - 后端不存在此接口，返回空数组
export const getTopicCategories = () => Promise.resolve([]);

// 获取话题列表（分页）
export const getTopics = (params?: { page?: number; pageSize?: number; category?: string; sort?: string }) =>
  api.get<ApiResponse<PaginatedPosts>>('/topics', { params }).then((r) => r.data.data);

// 获取话题详情
export const getTopic = (name: string) =>
  api.get<ApiResponse<Topic>>(`/topics/${encodeURIComponent(name)}`).then((r) => r.data.data);

// 获取话题下的动态
export const getTopicPosts = (name: string, params?: { page?: number; pageSize?: number }) =>
  api.get<ApiResponse<PaginatedPosts>>(`/topics/${encodeURIComponent(name)}/posts`, { params }).then((r) => r.data.data);

// 关注话题
export const followTopic = (topicId: number) =>
  api.post<ApiResponse<{ following: boolean; followCount: number }>>(`/topics/${topicId}/follow`).then((r) => r.data.data);

// 取消关注话题
export const unfollowTopic = (topicId: number) =>
  api.delete<ApiResponse<{ following: boolean; followCount: number }>>(`/topics/${topicId}/follow`).then((r) => r.data.data);

// 切换关注状态
export const toggleFollowTopic = (topicId: number, isFollowing: boolean) =>
  isFollowing
    ? api.delete<ApiResponse<{ following: boolean; followCount: number }>>(`/topics/${topicId}/follow`).then((r) => r.data.data)
    : api.post<ApiResponse<{ following: boolean; followCount: number }>>(`/topics/${topicId}/follow`).then((r) => r.data.data);

// 搜索话题
export const searchTopics = (keyword: string, params?: { limit?: number }) =>
  api.get<ApiResponse<Topic[]>>('/topics/search', { params: { keyword, ...params } }).then((r) => r.data.data);

// 获取用户关注的话题
export const getUserFollowedTopics = (params?: { page?: number; pageSize?: number }) =>
  api.get<ApiResponse<{ data: TopicRankingItem[]; pagination: { total: number } }>>('/topics/following', { params })
    .then((r) => r.data.data);