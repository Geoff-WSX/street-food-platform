import { create } from 'zustand';
import type { Notification } from '../types';

interface NotificationState {
  unreadCount: number;
  notifications: Notification[];
  setUnreadCount: (count: number) => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: number) => void;
  decrementUnread: (amount?: number) => void;
  incrementUnread: (amount?: number) => void;
  clearUnread: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  notifications: [],

  setUnreadCount: (count) => set({ unreadCount: count }),

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  decrementUnread: (amount = 1) =>
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - amount),
    })),

  incrementUnread: (amount = 1) =>
    set((state) => ({
      unreadCount: state.unreadCount + amount,
    })),

  clearUnread: () => set({ unreadCount: 0 }),
}));
