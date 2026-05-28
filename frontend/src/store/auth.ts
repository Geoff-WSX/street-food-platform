import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  checkTokenExpiration: () => boolean;
}

const TOKEN_KEY = 'sf_token';
const USER_KEY = 'sf_user';

/**
 * 解码 JWT token 获取过期时间
 */
function decodeTokenExpiration(token: string): Date | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 检查 token 是否过期
 */
function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const expiration = decodeTokenExpiration(token);
  if (!expiration) return true;
  return new Date() >= expiration;
}

function loadFromStorage(): { token: string | null; user: User | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    // 如果 token 存在但已过期，清除它
    if (token && isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return { token: null, user: null };
    }
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

  checkTokenExpiration: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      set({ token: null, user: null, isLoggedIn: false });
      return false;
    }
    return true;
  },
}));
