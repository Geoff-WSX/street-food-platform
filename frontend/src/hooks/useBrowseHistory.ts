import { useCallback } from 'react';
import { useBrowseHistoryStore } from '../store/browseHistory';
import type { Post } from '../types';

export function useBrowseHistory() {
  const { history, addToHistory, removeFromHistory, clearHistory } = useBrowseHistoryStore();

  const memoizedAddToHistory = useCallback((post: Post) => addToHistory(post), [addToHistory]);

  return {
    history,
    addToHistory: memoizedAddToHistory,
    removeFromHistory,
    clearHistory,
  };
}
