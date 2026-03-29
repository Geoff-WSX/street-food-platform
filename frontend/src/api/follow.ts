import api from './index';

// 关注用户
export const followUser = (userId: number) =>
  api.post(`/follows/${userId}/follow`).then((r) => r.data.data);

// 取消关注
export const unfollowUser = (userId: number) =>
  api.delete(`/follows/${userId}/follow`).then((r) => r.data.data);

// 获取关注列表
export const getFollowing = (userId: number) =>
  api.get(`/follows/${userId}/following`).then((r) => r.data.data);

// 获取粉丝列表
export const getFollowers = (userId: number) =>
  api.get(`/follows/${userId}/followers`).then((r) => r.data.data);

// 检查是否关注
export const checkFollowStatus = (userId: number) =>
  api.get(`/follows/${userId}/follow-status`).then((r) => r.data.data);
