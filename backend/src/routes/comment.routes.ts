import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getPostComments,
  getCommentRepliesHandler,
  createCommentHandler,
  deleteCommentHandler,
  toggleCommentLikeHandler,
  checkContentHandler,
} from '../controllers/comment.controller';

const router = Router();

// 获取动态的评论列表（公开）
router.get('/posts/:postId/comments', getPostComments);

// 获取评论的回复列表（公开）
router.get('/comments/:commentId/replies', getCommentRepliesHandler);

// 创建评论（需要登录）
router.post('/comments', authenticate, createCommentHandler);

// 删除评论（需要登录）
router.delete('/comments/:commentId', authenticate, deleteCommentHandler);

// 点赞/取消点赞评论（需要登录）
router.post('/comments/:commentId/like', authenticate, toggleCommentLikeHandler);

// 文字审查接口（需要登录）
router.post('/content/check', authenticate, checkContentHandler);

export default router;
