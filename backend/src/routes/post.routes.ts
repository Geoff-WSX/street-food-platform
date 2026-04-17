import { Router } from 'express';
import * as postController from '../controllers/post.controller';
import * as locationController from '../controllers/location.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { uploadPostImages } from '../middleware/upload';
import { validateCreatePost, paginationRules, idParamRules } from '../middleware/validation';

const router = Router();

// GET /api/posts - 获取动态列表（可选登录）
router.get('/', optionalAuth, paginationRules, postController.getPosts);

// GET /api/posts/random - 获取随机推荐的动态（可选登录）
router.get('/random', optionalAuth, postController.getRandomPosts);

// POST /api/posts - 发布动态（需登录）
// 支持两种方式：1. multipart/form-data 上传图片 2. JSON 格式传递图片 URL
router.post('/', authenticate, validateCreatePost, uploadPostImages, postController.createPost);

// GET /api/posts/favorites - 获取我的收藏（需登录）
router.get('/favorites', authenticate, paginationRules, postController.getUserFavorites);

// GET /api/posts/favorites/categories - 获取收藏分类列表（需登录）
router.get('/favorites/categories', authenticate, postController.getFavoriteCategories);

// GET /api/posts/likes - 获取我的点赞（需登录)
router.get('/likes', authenticate, paginationRules, postController.getUserLikes);

// GET /api/posts/by-tag-and-region - 按话题+地区获取动态
router.get('/by-tag-and-region', optionalAuth, paginationRules, postController.getPostsByTagAndRegion);

// GET /api/posts/user/:userId - 获取指定用户的动态（可选登录）
router.get('/user/:userId', optionalAuth, idParamRules, paginationRules, postController.getUserPosts);

// GET /api/posts/address/location - 根据经纬度获取地址（必须在 /:id 之前）
router.get('/address/location', locationController.getAddressByLocation);

// GET /api/posts/:id - 获取单个动态（可选登录）
router.get('/:id', optionalAuth, idParamRules, postController.getPostById);

// PUT /api/posts/:id - 更新动态（需登录）
router.put('/:id', authenticate, idParamRules, validateCreatePost, uploadPostImages, postController.updatePost);

// DELETE /api/posts/:id - 删除动态（需登录）
router.delete('/:id', authenticate, idParamRules, postController.deletePost);

// POST /api/posts/:id/like - 点赞/取消点赞（需登录）
router.post('/:id/like', authenticate, idParamRules, postController.toggleLike);

// POST /api/posts/:id/favorite - 收藏/取消收藏（需登录）
router.post('/:id/favorite', authenticate, idParamRules, postController.toggleFavorite);

// PUT /api/posts/:id/favorite - 更新收藏设置（置顶、分类）（需登录）
router.put('/:id/favorite', authenticate, idParamRules, postController.updateFavoriteSettings);

export default router;
