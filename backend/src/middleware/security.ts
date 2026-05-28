import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * 安全中间件配置
 * 包含：API限流、安全响应头、CSRF保护等
 */

// ========== 1. API 限流配置 ==========

// 根据环境设置不同的限流配置
const isTestEnv = process.env.NODE_ENV === 'test';
const isDevEnv = process.env.NODE_ENV === 'development';
const API_LIMIT = isTestEnv ? 100000 : (isDevEnv ? 10000 : 1000);

// 通用 API 限流（适中）
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: API_LIMIT, // 限制每个IP请求数
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    error: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true, // 返回标准的 `RateLimit-*` 头
  legacyHeaders: false,
  // 跳过成功请求（只计算失败请求）
  skipSuccessfulRequests: false, // 保持false，但大幅增加max值
  // 自定义处理器
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      error: 'TOO_MANY_REQUESTS',
      retryAfter: Math.round(1 * 60) // 1分钟后重试
    });
  }
});

// 认证接口限流（适中）
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20, // 15分钟内最多20次认证尝试
  message: {
    success: false,
    message: '认证尝试过多，请稍后再试',
    error: 'TOO_MANY_AUTH_ATTEMPTS'
  },
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: '认证尝试过多，请15分钟后再试',
      error: 'TOO_MANY_AUTH_ATTEMPTS',
      retryAfter: Math.round(15 * 60)
    });
  }
});

// ========== 登录尝试追踪（渐进式锁定）==========
interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockoutUntil: number;
}

// 存储登录尝试记录：key = email 或 IP
const loginAttempts = new Map<string, LoginAttempt>();

// 渐进式锁定时间（分钟）：第6次5分钟，第7次15分钟，第8次及以上30分钟
// 前5次失败不锁定，只记录
const getLockoutMinutes = (attemptCount: number): number => {
  if (attemptCount === 6) return 5;
  if (attemptCount === 7) return 15;
  if (attemptCount >= 8) return 30;
  return 0; // 前5次不锁定
};

// 清理过期记录（每小时）
const cleanupExpiredAttempts = () => {
  const now = Date.now();
  for (const [key, attempt] of loginAttempts.entries()) {
    if (attempt.lockoutUntil > 0 && attempt.lockoutUntil < now) {
      // 锁定已过期，重置计数
      if (attempt.count > 0) {
        attempt.count = 0;
      }
    }
    // 如果24小时内没有尝试，删除记录
    if (now - attempt.lastAttempt > 24 * 60 * 60 * 1000) {
      loginAttempts.delete(key);
    }
  }
};

// 每小时清理一次
setInterval(cleanupExpiredAttempts, 60 * 60 * 1000);

// 渐进式登录限制中间件
export const progressiveLoginLimiter = (req: Request, res: Response, next: NextFunction) => {
  // 从请求体获取 email，如果还没有可以先用 IP
  const ip = req.ip || 'unknown';
  const email = req.body?.email;

  // 如果没有 email，只有 IP，记录 IP 的尝试
  const key = email || ip;

  const now = Date.now();
  let attempt = loginAttempts.get(key);

  // 如果没有记录，或锁定已过期，创建新记录
  if (!attempt || (attempt.lockoutUntil > 0 && attempt.lockoutUntil < now)) {
    attempt = { count: 0, lastAttempt: now, lockoutUntil: 0 };
  }

  // 检查是否在锁定中
  if (attempt.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((attempt.lockoutUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return res.status(429).json({
      success: false,
      message: `登录尝试过多，请在 ${remainingMinutes} 分钟后重试，或联系管理员重置密码`,
      error: 'TOO_MANY_LOGIN_ATTEMPTS',
      retryAfter: remainingSeconds,
      attemptCount: attempt.count
    });
  }

  // 将尝试信息附加到请求对象，供登录成功后清除使用
  (req as any).loginAttemptKey = key;
  (req as any).loginAttemptRecord = attempt;

  next();
};

// 记录登录失败
export const recordLoginFailure = (req: Request) => {
  const key = (req as any).loginAttemptKey;
  const attempt = (req as any).loginAttemptRecord;

  if (!key || !attempt) return;

  attempt.count += 1;
  attempt.lastAttempt = Date.now();

  // 计算锁定时间（前5次不锁定）
  const lockoutMinutes = getLockoutMinutes(attempt.count);
  if (lockoutMinutes > 0) {
    attempt.lockoutUntil = Date.now() + lockoutMinutes * 60 * 1000;
    console.log(`[LoginAttempt] ${key} 失败尝试: ${attempt.count}次, 锁定${lockoutMinutes}分钟`);
  } else {
    attempt.lockoutUntil = 0; // 前5次不锁定
    console.log(`[LoginAttempt] ${key} 失败尝试: ${attempt.count}/5 (还可尝试${5 - attempt.count}次)`);
  }

  loginAttempts.set(key, attempt);
};

// 记录登录成功
export const recordLoginSuccess = (req: Request) => {
  const key = (req as any).loginAttemptKey;

  if (key && loginAttempts.has(key)) {
    // 只重置计数，不完全删除记录
    const attempt = loginAttempts.get(key)!;
    attempt.count = 0;
    attempt.lockoutUntil = 0;
    loginAttempts.set(key, attempt);
  }
};

// 上传接口限流
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20, // 1小时内最多上传20次
  message: {
    success: false,
    message: '上传次数过多，请稍后再试',
    error: 'TOO_MANY_UPLOADS'
  }
});

// AI 助手接口限流（防止滥用）
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 50, // 1小时内最多50次AI调用
  message: {
    success: false,
    message: 'AI调用次数过多，请稍后再试',
    error: 'TOO_MANY_AI_REQUESTS'
  }
});

// 搜索接口限流
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 20, // 1分钟内最多20次搜索
  message: {
    success: false,
    message: '搜索过于频繁，请稍后再试',
    error: 'TOO_MANY_SEARCHES'
  }
});

// ========== 2. 安全响应头配置 ==========

// Helmet 配置
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // HTTP Strict Transport Security (仅生产环境)
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  // 禁用 X-Powered-By 头
  hidePoweredBy: true,
  // 防止 MIME 类型嗅探
  noSniff: true,
  // 防止点击劫持
  frameguard: {
    action: 'deny'
  },
  // XSS 过滤器
  xssFilter: true,
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

// ========== 3. CORS 配置 ==========

export const corsOptions = {
  origin: function (origin: string | undefined, callback: any) {
    // 允许的域名列表
    const allowedOrigins = [
      'http://localhost:5176',
      'http://localhost:5177',
      'http://localhost:5178',
      'http://localhost:5179',
      'http://localhost:5180',
      'http://localhost:3000',
      'http://localhost:3002'
    ];

    // 开发环境和测试环境允许所有 localhost
    const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

    if (isDevOrTest) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('不允许的CORS来源'));
      }
    } else {
      // 生产环境需要严格配置
      const prodAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
      if (!origin || prodAllowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('不允许的CORS来源'));
      }
    }
  },
  credentials: true, // 允许携带凭证
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24小时
};

// ========== 4. CSRF 保护（可选）==========

// 注意：由于项目使用 JWT + API 模式，CSRF 风险相对较低
// 如果需要，可以启用以下中间件
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // 对于状态改变的请求，验证 Origin 头
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin || req.headers.referer;

    // 开发环境跳过检查
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    // 生产环境验证 Origin
    const allowedOrigins = process.env.CSRF_ALLOWED_ORIGINS?.split(',') || [];
    if (origin && allowedOrigins.some(allowed => origin.includes(allowed))) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: '无效的请求来源',
        error: 'FORBIDDEN'
      });
    }
  } else {
    next();
  }
};

// ========== 5. 请求体大小限制 ==========

export const bodySizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseInt(maxSize) * 1024 * 1024;

    if (contentLength > maxBytes) {
      return res.status(413).json({
        success: false,
        message: `请求体过大，最大允许 ${maxSize}`,
        error: 'PAYLOAD_TOO_LARGE'
      });
    }

    next();
  };
};

// ========== 6. 敏感信息过滤 ==========

export const sanitizeResponse = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = function(data: any) {
    // 移除敏感信息
    if (data && typeof data === 'object') {
      // 移除内部字段
      const safeData = JSON.parse(JSON.stringify(data));

      // 移除可能暴露内部结构的字段
      delete safeData.stack;
      delete safeData.internalCode;

      // 移除敏感配置信息
      if (safeData.config) {
        delete safeData.config.database;
        delete safeData.config.jwtSecret;
        delete safeData.config.apiKeys;
      }

      return originalJson(safeData);
    }

    return originalJson(data);
  };

  next();
};

// ========== 7. 安全日志记录 ==========

export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // 记录可疑活动
  const suspiciousPatterns = [
    /\.\./, // 路径遍历
    /<script>/i, // XSS 尝试
    /union.*select/i, // SQL 注入尝试
    /eval\(/i, // 代码注入尝试
    /\${/ // 模板注入尝试
  ];

  const requestBody = JSON.stringify(req.body);
  const queryString = JSON.stringify(req.query);

  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(requestBody) || pattern.test(queryString)
  );

  if (isSuspicious) {
    console.warn('⚠️  可疑请求检测:', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      body: requestBody,
      query: queryString,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// ========== 8. IP 白名单（管理接口）==========

const ADMIN_IPS = process.env.ADMIN_IPS?.split(',') || [];

export const adminIpWhitelist = (req: Request, res: Response, next: NextFunction) => {
  // 只对管理接口进行 IP 检查
  if (req.path.startsWith('/api/admin')) {
    const clientIp = req.ip || 'unknown';

    if (ADMIN_IPS.length > 0 && !ADMIN_IPS.includes(clientIp)) {
      return res.status(403).json({
        success: false,
        message: '访问被拒绝：IP地址不在白名单中',
        error: 'FORBIDDEN'
      });
    }
  }

  next();
};

// ========== 9. 导出组合中间件 ==========

export const applySecurityMiddleware = (app: any) => {
  // 应用所有安全中间件
  app.use(securityHeaders);
  app.use(sanitizeResponse);
  app.use(securityLogger);
  app.use(bodySizeLimit('10mb'));
};
