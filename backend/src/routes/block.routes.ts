import { Router } from 'express';
import * as blockController from '../controllers/block.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// 拉黑/取消拉黑
router.post('/:userId/block', blockController.blockUser);
router.delete('/:userId/block', blockController.unblockUser);

// 获取黑名单
router.get('/blocked', blockController.getBlockedList);

export default router;
