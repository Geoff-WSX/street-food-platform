import { Router } from 'express';
import * as tagController from '../controllers/tag.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/tags/popular - 获取热门标签
router.get('/popular', tagController.getPopularTags);

// GET /api/tags/:tag/posts - 根据标签获取帖子
router.get('/:tag/posts', optionalAuth, tagController.getPostsByTag);

export default router;