import { create } from 'zustand';

interface MessageState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementUnread: (amount?: number) => void;
  clearUnread: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  unreadCount: 0,

  setUnreadCount: (count) => set({ unreadCount: count }),

  decrementUnread: (amount = 1) =>
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - amount),
    })),

  clearUnread: () => set({ unreadCount: 0 }),
}));
