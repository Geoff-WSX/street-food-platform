export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  avatarData?: string;
  role?: string;
  createdAt: string;
  allowMessage?: boolean;
}

export interface Post {
  id: number;
  content: string;
  address?: string;
  images: string | string[];
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
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

export interface Notification {
  id: number;
  userId: number;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'COMMENT_LIKE' | 'FAVORITE' | 'FOLLOW';
  actorId: number;
  entityId: number;
  entityType: 'POST' | 'COMMENT' | 'USER';
  isRead: boolean;
  createdAt: string;
  actor: {
    id: number;
    username: string;
    avatar?: string;
  };
  post?: {
    id: number;
    content: string;
    images: string;
    user: {
      id: number;
      username: string;
    };
  };
  comment?: {
    id: number;
    content: string;
    post: {
      id: number;
      content: string;
    };
  };
}
