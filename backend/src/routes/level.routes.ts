import { Router } from 'express';
import * as levelController from '../controllers/level.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/levels - 获取所有等级定义
router.get('/', levelController.getAllLevels);

// GET /api/levels/tasks - 获取所有任务定义
router.get('/tasks', levelController.getAllTasks);

// GET /api/levels/me - 获取当前用户等级信息
router.get('/me', authenticate, levelController.getMyLevelInfo);

// POST /api/levels/init - 初始化用户等级
router.post('/init', authenticate, levelController.initLevel);

// POST /api/levels/check - 检查并更新用户任务进度
router.post('/check', authenticate, levelController.checkProgress);

// POST /api/levels/tasks/:taskKey/progress - 更新指定任务进度
router.post('/tasks/:taskKey/progress', authenticate, levelController.updateTaskProgress);

// POST /api/levels/tasks/:taskKey/increment - 增加任务进度
router.post('/tasks/:taskKey/increment', authenticate, levelController.incrementTaskProgress);

export default router;