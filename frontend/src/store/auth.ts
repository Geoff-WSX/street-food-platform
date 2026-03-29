import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const TOKEN_KEY = 'sf_token';
const USER_KEY = 'sf_user';

function loadFromStorage(): { token: string | null; user: User | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    const user = userStr ? { ...(JSON.parse(userStr) as User), role: (JSON.parse(userStr) as User).role || 'user' } : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

const { token: storedToken, user: storedUser } = loadFromStorage();

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: storedUser,
  isLoggedIn: !!storedToken,

  login: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isLoggedIn: false });
  },

  updateUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
