import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import * as suggestController from '../controllers/suggest.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// 全局搜索（需要登录）
router.get('/', authenticate, searchController.search);

// 快速搜索用户（自动补全用，不需要登录）
router.get('/users', optionalAuth, searchController.searchUsers);

// 搜索动态（不需要登录）
router.get('/posts', optionalAuth, searchController.searchPosts);

// 搜索建议（不需要登录）
router.get('/suggest', optionalAuth, suggestController.searchSuggestions);

// 刷新建议缓存（需要管理员权限）
router.post('/suggest/refresh', authenticate, suggestController.refreshSuggestions);

export default router;
