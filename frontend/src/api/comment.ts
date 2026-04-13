import api from './index';

// 评论类型
export interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  parentId: number | null;
  replyToUserId: number | null;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  user: {
    id: number;
    username: string;
    avatar?: string;
    avatarData?: string;
  };
  replyToUser?: {
    id: number;
    username: string;
  };
  replies?: Comment[];
  replyCount?: number;
}

// 获取动态的评论列表
export const getComments = (postId: number, params?: { page?: number; pageSize?: number }) => {
  return api.get<{
    data: Comment[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>(`/posts/${postId}/comments`, { params });
};

// 获取评论的回复列表
export const getCommentReplies = (commentId: number, params?: { page?: number; pageSize?: number }) => {
  return api.get<{
    data: Comment[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>(`/comments/${commentId}/replies`, { params });
};

// 创建评论
export const createComment = (data: {
  postId: number;
  content: string;
  parentId?: number;
  replyToUserId?: number;
}) => {
  return api.post<{ message: string; data: Comment }>('/comments', data);
};

// 删除评论
export const deleteComment = (commentId: number) => {
  return api.delete<{ message: string }>(`/comments/${commentId}`);
};

// 点赞/取消点赞评论
export const toggleCommentLike = (commentId: number) => {
  return api.post<{ liked: boolean; likeCount: number }>(`/comments/${commentId}/like`);
};

// 文字审查
export const checkContent = (content: string) => {
  return api.post<{ valid: boolean; violations: string[]; message: string }>('/content/check', { content });
};
