import { Router } from 'express';
import * as topicController from '../controllers/topic.controller';
import { authenticate, optionalAuth, requireLevel } from '../middleware/auth';

const router = Router();

// GET /api/topics - 获取热门话题排行榜
router.get('/', optionalAuth, topicController.getPopularTopics);

// POST /api/topics - 创建话题（需要Lv4 美食专家）
router.post('/', authenticate, requireLevel(4), topicController.createTopic);

// GET /api/topics/following - 获取用户关注的话题列表
router.get('/following', authenticate, topicController.getUserFollowedTopics);

// GET /api/topics/check-follow - 批量检查话题关注状态
router.get('/check-follow', authenticate, topicController.checkTopicFollowStatus);

// GET /api/topics/search - 搜索话题
router.get('/search', topicController.searchTopics);

// GET /api/topics/:name - 获取话题详情
router.get('/:name', optionalAuth, topicController.getTopicDetail);

// GET /api/topics/:name/posts - 获取话题下的动态
router.get('/:name/posts', optionalAuth, topicController.getTopicPosts);

// POST /api/topics/:id/follow - 关注话题
router.post('/:id/follow', authenticate, topicController.followTopic);

// DELETE /api/topics/:id/follow - 取消关注话题
router.delete('/:id/follow', authenticate, topicController.unfollowTopic);

export default router;
