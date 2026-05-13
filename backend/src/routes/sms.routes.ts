import { Router } from 'express';
import * as smsController from '../controllers/sms.controller';

const router = Router();

// POST /api/sms/send - 发送短信验证码
router.post('/send', smsController.sendSms);

export default router;
