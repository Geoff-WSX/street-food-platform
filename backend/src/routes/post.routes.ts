import { Router } from 'express';
import * as postController from '../controllers/post.controller';
import { authenticate } from '../middleware/auth';
import { uploadPostImages } from '../middleware/upload';

const router = Router();

// GET /api/posts - 获取动态列表
router.get('/', postController.getPosts);

// POST /api/posts - 发布动态（需登录）
router.post('/', authenticate, uploadPostImages, postController.createPost);

// GET /api/posts/favorites - 获取我的收藏（需登录）
router.get('/favorites', authenticate, postController.getUserFavorites);

// GET /api/posts/user/:userId - 获取指定用户的动态
router.get('/user/:userId', postController.getUserPosts);

// GET /api/posts/:id - 获取单个动态
router.get('/:id', postController.getPostById);

// PUT /api/posts/:id - 更新动态（需登录）
router.put('/:id', authenticate, uploadPostImages, postController.updatePost);

// DELETE /api/posts/:id - 删除动态（需登录）
router.delete('/:id', authenticate, postController.deletePost);

// POST /api/posts/:id/like - 点赞/取消点赞（需登录）
router.post('/:id/like', authenticate, postController.toggleLike);

// POST /api/posts/:id/favorite - 收藏/取消收藏（需登录）
router.post('/:id/favorite', authenticate, postController.toggleFavorite);

export default router;
