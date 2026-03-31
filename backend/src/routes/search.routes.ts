import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// 全局搜索（需要登录）
router.get('/', authenticate, searchController.search);

// 快速搜索用户（自动补全用，不需要登录）
router.get('/users', optionalAuth, searchController.searchUsers);

// 搜索动态（不需要登录）
router.get('/posts', optionalAuth, searchController.searchPosts);

export default router;
