import api from './index';
import type { ApiResponse } from '../types';

// 类型定义
export interface Level {
  id: number;
  level: number;
  name: string;
  minExp: number;
  maxExp: number | null;
  icon: string | null;
  description: string | null;
}

export interface LevelTask {
  id: number;
  taskKey: string;
  name: string;
  description: string | null;
  expReward: number;
  targetCount: number;
  icon: string | null;
}

export interface UserLevelProgress {
  taskKey: string;
  taskName: string;
  description?: string | null;
  currentCount: number;
  targetCount: number;
  expReward: number;
  completed: boolean;
  completedAt: string | null;
  icon: string | null;
}

export interface UserLevelInfo {
  currentLevel: Level;
  exp: number;
  expToNextLevel: number | null;
  nextLevel: Level | null;
  progress: (UserLevelProgress & { progress: number })[];
}

export const getAllLevels = () =>
  api.get<ApiResponse<Level[]>>('/levels').then((r) => r.data.data);

export const getMyLevelInfo = () =>
  api.get<ApiResponse<UserLevelInfo>>('/levels/me').then((r) => r.data.data);