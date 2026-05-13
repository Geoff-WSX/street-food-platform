import svgCaptcha from 'svg-captcha';
import crypto from 'crypto';

// 存储验证码（生产环境应该用 Redis）
const captchaStore = new Map<string, { code: string; expiresAt: number }>();

/**
 * 生成验证码
 */
export const generateCaptcha = () => {
  const captcha = svgCaptcha.create({
    width: 120,
    height: 40,
    fontSize: 48,
    noise: 3,
    background: '#f4f4f4',
    charPreset: '1234567890ABCDEFGHJKLMNPQRSTUVWXYZ',
  });

  const captchaId = crypto.randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5分钟有效期

  captchaStore.set(captchaId, {
    code: captcha.text.toLowerCase(),
    expiresAt,
  });

  return {
    id: captchaId,
    data: captcha.data,
  };
};

/**
 * 验证验证码
 */
export const verifyCaptcha = (id: string, code: string): boolean => {
  const captcha = captchaStore.get(id);

  if (!captcha) {
    return false;
  }

  // 检查是否过期
  if (Date.now() > captcha.expiresAt) {
    captchaStore.delete(id);
    return false;
  }

  // 验证通过后删除验证码（一次性使用）
  if (captcha.code === code.toLowerCase()) {
    captchaStore.delete(id);
    return true;
  }

  return false;
};

/**
 * 清理过期验证码（定时任务）
 */
export const cleanupExpiredCaptchas = () => {
  const now = Date.now();

  // 清理过期验证码
  for (const [id, captcha] of captchaStore.entries()) {
    if (now > captcha.expiresAt) {
      captchaStore.delete(id);
    }
  }
};
