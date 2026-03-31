import { Router } from 'express';
import * as adminLogController from '../controllers/adminLog.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有管理员日志路由都需要认证
router.use(authenticate);

// 管理员权限检查中间件
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: '需要管理员权限',
      code: 'ADMIN_REQUIRED',
    });
  }
  next();
};

router.use(requireAdmin);

// 获取操作日志列表
router.get('/logs', adminLogController.getAdminLogs);

// 获取操作日志详情
router.get('/logs/:id', adminLogController.getAdminLogById);

// 获取操作统计
router.get('/logs-stats/summary', adminLogController.getAdminLogStats);

// 获取操作类型列表
router.get('/action-types', adminLogController.getActionTypes);

export default router;