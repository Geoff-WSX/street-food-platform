import api from './index';

// 拉黑用户
export const blockUser = (userId: number) =>
  api.post(`/blocks/${userId}/block`).then((r) => r.data.data);

// 取消拉黑
export const unblockUser = (userId: number) =>
  api.delete(`/blocks/${userId}/block`).then((r) => r.data.data);

// 获取黑名单
export const getBlockedList = () =>
  api.get('/blocks/blocked').then((r) => r.data.data);
