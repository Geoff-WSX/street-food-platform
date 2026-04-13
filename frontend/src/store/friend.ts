import { create } from 'zustand';
import * as api from '../api/friend';
import type { User } from '../types';

interface FriendRequest {
  id: number;
  senderId: number;
  receiverId: number;
  message?: string;
  status: string;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

interface Friend {
  id: number;
  userId: number;
  user?: User;
  username: string;
  avatar?: string;
  bio?: string;
  note?: string;
  establishedAt: string;
  mutualCount?: number;
}

interface FriendState {
  friends: Friend[];
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  recommendations: Friend[];
  friendCount: number;
  unreadRequestCount: number;
  loading: boolean;

  // Actions
  fetchFriends: (params?: { page?: number; pageSize?: number; search?: string }) => Promise<void>;
  fetchReceivedRequests: () => Promise<void>;
  fetchSentRequests: () => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  sendRequest: (userId: number, message?: string) => Promise<void>;
  acceptRequest: (requestId: number) => Promise<void>;
  rejectRequest: (requestId: number) => Promise<void>;
  cancelRequest: (requestId: number) => Promise<void>;
  removeFriend: (userId: number) => Promise<void>;

  // Selectors
  isFriend: (userId: number) => boolean;
  hasPendingRequest: (userId: number) => boolean;
  hasReceivedRequest: (userId: number) => boolean;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  recommendations: [],
  friendCount: 0,
  unreadRequestCount: 0,
  loading: false,

  fetchFriends: async (params) => {
    set({ loading: true });
    try {
      const res = await api.getFriends(params);
      const data = res.data?.data || res.data;
      set({
        friends: data?.friends || [],
        friendCount: data?.pagination?.total || 0,
        loading: false
      });
    } catch (error) {
      console.error('获取好友列表失败:', error);
      set({ friends: [], friendCount: 0, loading: false });
    }
  },

  fetchReceivedRequests: async () => {
    try {
      const res = await api.getReceivedRequests();
      const requests = res.data?.data || res.data || [];
      set({ receivedRequests: requests, unreadRequestCount: requests.length });
    } catch (error) {
      console.error('获取收到的好友请求失败:', error);
      set({ receivedRequests: [], unreadRequestCount: 0 });
    }
  },

  fetchSentRequests: async () => {
    try {
      const res = await api.getSentRequests();
      set({ sentRequests: res.data?.data || res.data || [] });
    } catch (error) {
      console.error('获取发出的好友请求失败:', error);
      set({ sentRequests: [] });
    }
  },

  fetchRecommendations: async () => {
    try {
      const res = await api.getFriendRecommendations();
      set({ recommendations: res.data?.data || res.data || [] });
    } catch (error) {
      console.error('获取好友推荐失败:', error);
      set({ recommendations: [] });
    }
  },

  sendRequest: async (userId, message) => {
    await api.sendFriendRequest(userId, message);
    await get().fetchSentRequests();
  },

  acceptRequest: async (requestId) => {
    await api.acceptFriendRequest(requestId);
    await get().fetchReceivedRequests();
    await get().fetchFriends();
  },

  rejectRequest: async (requestId) => {
    await api.rejectFriendRequest(requestId);
    await get().fetchReceivedRequests();
  },

  cancelRequest: async (requestId) => {
    await api.cancelFriendRequest(requestId);
    await get().fetchSentRequests();
  },

  removeFriend: async (userId) => {
    await api.removeFriend(userId);
    await get().fetchFriends();
  },

  isFriend: (userId) => get().friends.some(f => f.userId === userId || f.id === userId),

  hasPendingRequest: (userId) => get().sentRequests.some(r => r.receiverId === userId),

  hasReceivedRequest: (userId) => get().receivedRequests.some(r => r.senderId === userId),
}));