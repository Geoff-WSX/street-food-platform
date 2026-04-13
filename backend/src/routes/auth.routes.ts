import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateRegister, validateLogin } from '../middleware/validation';

const router = Router();

// POST /api/auth/register
router.post('/register', validateRegister, authController.register);

// POST /api/auth/login
router.post('/login', validateLogin, authController.login);

// POST /api/auth/wx-login
router.post('/wx-login', authController.wxLogin);

// POST /api/auth/logout (需要认证)
router.post('/logout', authenticate, authController.logout);

// POST /api/auth/refresh (需要认证)
router.post('/refresh', authenticate, authController.refreshToken);

export default router;
