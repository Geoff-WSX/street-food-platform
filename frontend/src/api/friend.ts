import api from './index';

// 获取好友列表
export const getFriends = (params?: { page?: number; pageSize?: number; search?: string }) =>
  api.get('/friends', { params });

// 获取好友数量
export const getFriendsCount = () =>
  api.get('/friends/count').then(r => r.data.data);

// 检查是否为好友
export const checkFriendship = async (userId: number) => {
  const res = await api.get(`/friends/${userId}/check`);
  return res.data?.data || res.data;
};

// 删除好友
export const removeFriend = (userId: number) =>
  api.delete(`/friends/${userId}`);

// 获取收到的好友请求
export const getReceivedRequests = () =>
  api.get('/friends/requests/received').then(r => r.data.data);

// 获取发出的好友请求
export const getSentRequests = () =>
  api.get('/friends/requests').then(r => r.data.data);

// 发送好友请求
export const sendFriendRequest = (userId: number, message?: string) =>
  api.post(`/friends/requests/${userId}`, { message }).then(r => r.data.data);

// 接受好友请求
export const acceptFriendRequest = (requestId: number) =>
  api.post(`/friends/requests/${requestId}/accept`);

// 拒绝好友请求
export const rejectFriendRequest = (requestId: number) =>
  api.post(`/friends/requests/${requestId}/reject`);

// 取消好友请求
export const cancelFriendRequest = (requestId: number) =>
  api.delete(`/friends/requests/${requestId}`);

// 获取好友推荐
export const getFriendRecommendations = () =>
  api.get('/friends/recommendations').then(r => r.data.data);