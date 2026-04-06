import { create } from 'zustand';
import { checkFollowStatus } from '../api/follow';

interface FollowState {
  // Map of userId -> isFollowing
  followStatus: Record<number, boolean>;
  setFollowStatus: (userId: number, isFollowing: boolean) => void;
  getFollowStatus: (userId: number) => boolean | undefined;
  checkAndCacheStatus: (userId: number) => Promise<boolean>;
  clearCache: () => void;
}

export const useFollowStore = create<FollowState>((set, get) => ({
  followStatus: {},

  setFollowStatus: (userId, isFollowing) => {
    set((state) => ({
      followStatus: {
        ...state.followStatus,
        [userId]: isFollowing,
      },
    }));
  },

  getFollowStatus: (userId) => {
    return get().followStatus[userId];
  },

  checkAndCacheStatus: async (userId) => {
    // Check cache first
    const cached = get().followStatus[userId];
    if (cached !== undefined) {
      return cached;
    }

    // If not cached, fetch from API
    try {
      const result = await checkFollowStatus(userId);
      set((state) => ({
        followStatus: {
          ...state.followStatus,
          [userId]: result.isFollowing,
        },
      }));
      return result.isFollowing;
    } catch {
      return false;
    }
  },

  clearCache: () => {
    set({ followStatus: {} });
  },
}));
