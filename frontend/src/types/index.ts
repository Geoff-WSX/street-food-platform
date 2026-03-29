export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  role?: string;
  createdAt: string;
  allowMessage?: boolean;
}

export interface Post {
  id: number;
  content: string;
  address?: string;
  images: string[];
  likeCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  user: User;
  isLiked?: boolean;
  isFavorited?: boolean;
}

export interface PaginatedPosts {
  data: Post[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthData {
  token: string;
  user: User;
}

// Wrapper for all backend responses
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
