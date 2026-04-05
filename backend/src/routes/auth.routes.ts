import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/wx-login
router.post('/wx-login', authController.wxLogin);

export default router;
