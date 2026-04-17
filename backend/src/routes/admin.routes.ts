import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有管理员路由都需要认证
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

// 应用管理员权限检查
router.use(requireAdmin);

// 获取系统统计
router.get('/stats', adminController.getSystemStats);

// 同步评论数
router.post('/sync-comment-count', adminController.syncCommentCount);

// 获取所有用户
router.get('/users', adminController.getAllUsers);

// 更新用户角色
router.put('/users/:id/role', adminController.updateUserRole);

// 启用/禁用用户
router.put('/users/:id/status', adminController.toggleUserStatus);

// 重置用户密码
router.put('/users/:id/password', adminController.resetUserPassword);

// 删除用户
router.delete('/users/:id', adminController.deleteUser);

export default router;
