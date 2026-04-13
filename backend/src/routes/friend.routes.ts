import { Router } from 'express';
import * as friendController from '../controllers/friend.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有好友相关接口都需要登录
router.use(authenticate);

// 好友请求相关
router.get('/requests/received', friendController.getReceivedRequests);
router.get('/requests', friendController.getSentRequests);
router.post('/requests/:userId', friendController.sendFriendRequest);
router.post('/requests/:requestId/accept', friendController.acceptFriendRequest);
router.post('/requests/:requestId/reject', friendController.rejectFriendRequest);
router.delete('/requests/:requestId', friendController.cancelFriendRequest);

// 好友列表相关
router.get('/', friendController.getFriends);
router.get('/count', friendController.getFriendsCount);
router.get('/recommendations', friendController.getFriendRecommendations);
router.get('/:targetId/check', friendController.checkFriendship);
router.delete('/:friendId', friendController.removeFriend);

export default router;