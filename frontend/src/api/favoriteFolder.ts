import api from './index';
import type { ApiResponse } from '../types';

export interface FavoriteFolder {
  id: number;
  userId: number;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    favorites: number;
  };
}

export const getFavoriteFolders = () =>
  api.get<ApiResponse<FavoriteFolder[]>>('/favorites/folders').then((r) => r.data.data);

export const createFavoriteFolder = (name: string) =>
  api.post<ApiResponse<FavoriteFolder>>('/favorites/folders', { name }).then((r) => r.data.data);

export const renameFavoriteFolder = (folderId: number, name: string) =>
  api.put<ApiResponse<FavoriteFolder>>(`/favorites/folders/${folderId}`, { name }).then((r) => r.data.data);

export const deleteFavoriteFolder = (folderId: number) =>
  api.delete(`/favorites/folders/${folderId}`).then((r) => r.data);

export const setDefaultFavoriteFolder = (folderId: number) =>
  api.put<ApiResponse<{}>>(`/favorites/folders/${folderId}/default`).then((r) => r.data.data);

export const cancelDefaultFavoriteFolder = () =>
  api.delete<ApiResponse<{}>>('/favorites/folders/0/default').then((r) => r.data.data);
