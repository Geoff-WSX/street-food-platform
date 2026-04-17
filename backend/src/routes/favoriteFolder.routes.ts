import { Router } from 'express';
import * as favoriteFolderController from '../controllers/favoriteFolder.controller';
import { checkBlacklist } from '../utils/jwtBlacklist';

const router = Router();

// 所有路由都需要认证
router.use(checkBlacklist);

// 获取文件夹列表
router.get('/folders', favoriteFolderController.getFolders);

// 创建文件夹
router.post('/folders', favoriteFolderController.createFolder);

// 重命名文件夹
router.put('/folders/:id', favoriteFolderController.renameFolder);

// 删除文件夹
router.delete('/folders/:id', favoriteFolderController.deleteFolder);

// 设置默认文件夹
router.put('/folders/:id/default', favoriteFolderController.setDefaultFolder);

// 取消默认文件夹
router.delete('/folders/:id/default', favoriteFolderController.cancelDefaultFolder);

export default router;
