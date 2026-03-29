import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';

const router = Router();

// GET /api/users/me - 获取当前用户信息
router.get('/me', authenticate, userController.getProfile);

// GET /api/users/:id - 获取指定用户信息
router.get('/:id', userController.getUserById);

// PUT /api/users/me/profile - 更新个人资料
router.put('/me/profile', authenticate, userController.updateProfile);

// PUT /api/users/me/avatar - 更新头像
router.put('/me/avatar', authenticate, uploadAvatar, userController.updateAvatar);

// PUT /api/users/me/password - 修改密码
router.put('/me/password', authenticate, userController.changePassword);

// PUT /api/users/me/settings - 更新用户设置
router.put('/me/settings', authenticate, userController.updateSettings);

export default router;
