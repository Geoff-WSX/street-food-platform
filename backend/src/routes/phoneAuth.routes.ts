import { Router } from 'express';
import * as phoneAuthController from '../controllers/phoneAuth.controller';

const router = Router();

// POST /api/auth/phone-register - 手机号注册
router.post('/phone-register', phoneAuthController.phoneRegisterController);

// POST /api/auth/phone-login - 手机号登录
router.post('/phone-login', phoneAuthController.phoneLoginController);

export default router;
