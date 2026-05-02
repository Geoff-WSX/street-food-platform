import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';

const router = Router();

// GET /api/users/me - 获取当前用户信息
router.get('/me', authenticate, userController.getProfile);

// GET /api/users/:id - 获取指定用户信息（可选认证，用于检查关注状态）
router.get('/:id', optionalAuth, userController.getUserById);

// PUT /api/users/me/profile - 更新个人资料
router.put('/me/profile', authenticate, userController.updateProfile);

// PUT /api/users/me/avatar - 更新头像
router.put('/me/avatar', authenticate, (req, res, next) => {
  console.log('[DEBUG] Avatar upload request received');
  console.log('[DEBUG] Content-Type:', req.headers['content-type']);
  console.log('[DEBUG] Has body:', !!req.body);
  console.log('[DEBUG] Body keys:', req.body ? Object.keys(req.body) : 'no body');
  next();
}, uploadAvatar, userController.updateAvatar);

// GET /api/users/avatars/defaults - 获取预设头像列表
router.get('/avatars/defaults', userController.getDefaultAvatars);

// GET /api/users/me/avatars/customs - 获取自定义头像列表
router.get('/me/avatars/customs', authenticate, userController.getCustomAvatars);

// PUT /api/users/me/avatars/customs - 添加自定义头像
router.put('/me/avatars/customs', authenticate, uploadAvatar, userController.addCustomAvatar);

// DELETE /api/users/me/avatars/customs/:avatarId - 删除自定义头像
router.delete('/me/avatars/customs/:avatarId', authenticate, userController.deleteCustomAvatar);

// PUT /api/users/me/avatar/default - 设置预设头像
router.put('/me/avatar/default', authenticate, userController.setDefaultAvatar);

// PUT /api/users/me/password - 修改密码
router.put('/me/password', authenticate, userController.changePassword);

// PUT /api/users/me/settings - 更新用户设置
router.put('/me/settings', authenticate, userController.updateSettings);

// PUT /api/users/me/privacy - 更新隐私设置
router.put('/me/privacy', authenticate, userController.updatePrivacySettings);

// POST /api/users/:id/follow - 关注用户
router.post('/:id/follow', authenticate, userController.followUser);

// DELETE /api/users/:id/follow - 取消关注
router.delete('/:id/follow', authenticate, userController.unfollowUser);

// GET /api/users/:id/following - 获取关注列表
router.get('/:id/following', userController.getFollowing);

// GET /api/users/:id/followers - 获取粉丝列表
router.get('/:id/followers', userController.getFollowers);

// GET /api/users/:id/follow-status - 检查关注状态
router.get('/:id/follow-status', authenticate, userController.getFollowStatus);

// POST /api/users/:id/block - 拉黑用户
router.post('/:id/block', authenticate, userController.blockUser);

// DELETE /api/users/:id/block - 取消拉黑
router.delete('/:id/block', authenticate, userController.unblockUser);

// GET /api/users/blocks/blocked - 获取黑名单
router.get('/blocks/blocked', authenticate, userController.getBlockedUsers);

export default router;
