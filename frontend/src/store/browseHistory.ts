import { create } from 'zustand';
import type { Post } from '../types';
import { getAvatarUrl } from '../utils/images';

const STORAGE_KEY = 'browse_history';
const MAX_HISTORY = 20;

export interface BrowseHistoryItem {
  id: number;
  content: string;
  images: string[];
  address?: string;
  username: string;
  userAvatar: string;
  visitedAt: number;
}

interface BrowseHistoryState {
  history: BrowseHistoryItem[];
  addToHistory: (post: Post) => void;
  removeFromHistory: (id: number) => void;
  clearHistory: () => void;
}

function loadFromStorage(): BrowseHistoryItem[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(history: BrowseHistoryItem[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore storage errors
  }
}

export const useBrowseHistoryStore = create<BrowseHistoryState>((set) => ({
  history: loadFromStorage(),

  addToHistory: (post: Post) => {
    const item: BrowseHistoryItem = {
      id: post.id,
      content: post.content,
      images: Array.isArray(post.images) ? post.images : [],
      address: post.address,
      username: post.user?.username || '未知用户',
      userAvatar: getAvatarUrl(post.user),
      visitedAt: Date.now(),
    };

    set((state) => {
      const filtered = state.history.filter((h) => h.id !== item.id);
      const updated = [item, ...filtered].slice(0, MAX_HISTORY);
      saveToStorage(updated);
      return { history: updated };
    });
  },

  removeFromHistory: (id: number) => {
    set((state) => {
      const updated = state.history.filter((h) => h.id !== id);
      saveToStorage(updated);
      return { history: updated };
    });
  },

  clearHistory: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    set({ history: [] });
  },
}));
