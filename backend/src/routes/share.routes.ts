import { Router } from 'express';
import * as shareController from '../controllers/share.controller';
import { authenticate, requireLevel } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 分享给好友
router.post('/to-friend', shareController.shareToFriend);

// 推荐动态到自己的主页（需要Lv3 美食达人）
router.post('/recommend', authenticate, requireLevel(3), shareController.recommendPost);

// 获取推荐的所有动态
router.get('/recommended', shareController.getRecommendedPosts);

// 获取好友列表（用于分享时选择好友）
router.get('/friends', shareController.getFriendsForShare);

// 删除推荐记录
router.delete('/recommended/:postId', shareController.deleteRecommend);

export default router;
