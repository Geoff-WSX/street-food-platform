import { Router } from 'express';
import * as captchaController from '../controllers/captcha.controller';

const router = Router();

// GET /api/captcha
router.get('/', captchaController.getCaptcha);

export default router;
