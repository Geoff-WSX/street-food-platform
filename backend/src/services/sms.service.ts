import crypto from 'crypto';

// 存储短信验证码（生产环境应该用 Redis）
const smsCodeStore = new Map<string, { code: string; expiresAt: number; lastSentAt: number }>();

/**
 * 生成6位数字验证码（使用加密安全的随机数）
 */
const generateSmsCode = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * 发送短信验证码（模拟实现）
 * 实际生产需要对接阿里云/腾讯云短信API
 */
export const sendSmsCode = async (phone: string): Promise<{ success: boolean; message: string }> => {
  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, message: '手机号格式不正确' };
  }

  // 检查发送频率（60秒内只能发送一次）
  const existingCode = smsCodeStore.get(phone);
  const now = Date.now();
  if (existingCode && (now - existingCode.lastSentAt) < 60000) {
    const remainingTime = Math.ceil((60000 - (now - existingCode.lastSentAt)) / 1000);
    return { success: false, message: `请 ${remainingTime} 秒后再试` };
  }

  // 生成验证码
  const code = generateSmsCode();
  const expiresAt = now + 10 * 60 * 1000; // 10分钟有效期

  // 存储验证码（记录发送时间用于限流）
  smsCodeStore.set(phone, { code, expiresAt, lastSentAt: now });

  // 模拟发送短信（实际生产中这里调用短信API）
  console.log(`[SMS] 发送验证码到 ${phone}: ${code}`);

  return { success: true, message: '验证码已发送' };
};

/**
 * 验证短信验证码（使用时序安全的比较）
 */
export const verifySmsCode = (phone: string, code: string): boolean => {
  const record = smsCodeStore.get(phone);

  if (!record) {
    return false;
  }

  // 检查是否过期
  if (Date.now() > record.expiresAt) {
    smsCodeStore.delete(phone);
    return false;
  }

  // 使用时序安全的比较（防止时序攻击）
  const isValid = record.code.length === code.length &&
    crypto.timingSafeEqual(Buffer.from(record.code), Buffer.from(code));

  // 验证通过后删除验证码（一次性使用）
  if (isValid) {
    smsCodeStore.delete(phone);
    return true;
  }

  return false;
};

/**
 * 清理过期短信验证码
 */
export const cleanupExpiredSmsCodes = () => {
  const now = Date.now();
  for (const [phone, record] of smsCodeStore.entries()) {
    if (now > record.expiresAt) {
      smsCodeStore.delete(phone);
    }
  }
};

// 启动定期清理（每5分钟清理一次过期验证码）
setInterval(cleanupExpiredSmsCodes, 5 * 60 * 1000);
