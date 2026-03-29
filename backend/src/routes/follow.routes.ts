import { Router } from 'express';
import * as followController from '../controllers/follow.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有关注相关接口都需要登录
router.use(authenticate);

// 关注/取消关注用户
router.post('/:userId/follow', followController.followUser);
router.delete('/:userId/follow', followController.unfollowUser);

// 获取关注列表
router.get('/:userId/following', followController.getFollowing);

// 获取粉丝列表
router.get('/:userId/followers', followController.getFollowers);

// 检查是否关注
router.get('/:userId/follow-status', followController.checkFollowStatus);

export default router;
