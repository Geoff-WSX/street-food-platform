import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * JWT 黑名单管理
 * 实现登出后 token 失效功能
 */

// ========== 黑名单存储 ==========

// 使用内存存储（生产环境应使用 Redis）
const tokenBlacklist = new Set<string>();
const tokenExpiry = new Map<string, number>();

// ========== 黑名单操作 ==========

/**
 * 将 token 加入黑名单
 * @param token - 要加入黑名单的 token
 * @param expiresIn - token 过期时间（秒）
 */
export const addToBlacklist = (token: string, expiresIn: number): void => {
  try {
    // 解码 token 获取过期时间
    const decoded = jwt.decode(token) as { exp?: number };

    if (decoded && decoded.exp) {
      // 计算剩余有效时间
      const now = Math.floor(Date.now() / 1000);
      const remainingTime = decoded.exp - now;

      if (remainingTime > 0) {
        // 加入黑名单
        tokenBlacklist.add(token);
        tokenExpiry.set(token, decoded.exp * 1000); // 存储过期时间（毫秒）

        console.log(`Token 已加入黑名单，剩余有效时间: ${remainingTime}秒`);

        // 设置自动清理
        setTimeout(() => {
          removeFromBlacklist(token);
        }, remainingTime * 1000);
      }
    }
  } catch (error) {
    console.error('加入黑名单失败:', error);
  }
};

/**
 * 从黑名单中移除 token
 * @param token - 要移除的 token
 */
export const removeFromBlacklist = (token: string): void => {
  tokenBlacklist.delete(token);
  tokenExpiry.delete(token);
};

/**
 * 检查 token 是否在黑名单中
 * @param token - 要检查的 token
 * @returns 是否在黑名单中
 */
export const isBlacklisted = (token: string): boolean => {
  // 先检查是否在黑名单中
  if (tokenBlacklist.has(token)) {
    // 检查是否已过期
    const expiry = tokenExpiry.get(token);
    if (expiry && Date.now() > expiry) {
      // 已过期，从黑名单移除
      removeFromBlacklist(token);
      return false;
    }
    return true;
  }

  return false;
};

/**
 * 清理过期的黑名单 token
 */
export const cleanupExpiredTokens = (): void => {
  const now = Date.now();

  for (const [token, expiry] of tokenExpiry.entries()) {
    if (now > expiry) {
      removeFromBlacklist(token);
    }
  }
};

/**
 * 获取黑名单统计信息
 */
export const getBlacklistStats = () => {
  return {
    totalBlacklisted: tokenBlacklist.size,
    tokens: Array.from(tokenBlacklist).map(token => ({
      token: token.substring(0, 20) + '...',
      expiresAt: tokenExpiry.get(token)
    }))
  };
};

// ========== 中间件 ==========

/**
 * JWT 黑名单检查中间件
 */
export const checkBlacklist = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    // 检查是否在黑名单中
    if (isBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token 已失效，请重新登录',
        error: 'TOKEN_BLACKLISTED'
      });
    }

    next();
  } catch (error) {
    console.error('黑名单检查失败:', error);
    next();
  }
};

// ========== 定时清理 ==========

// 每5分钟清理一次过期的 token
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

// ========== Redis 集成（生产环境推荐）==========

/**
 * Redis 黑名单管理（生产环境使用）
 * 需要安装 ioredis: npm install ioredis
 */
/*
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0')
});

const BLACKLIST_PREFIX = 'token:blacklist:';

export const addToBlacklistRedis = async (token: string, expiresIn: number): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as { exp?: number };

    if (decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const remainingTime = decoded.exp - now;

      if (remainingTime > 0) {
        await redis.setex(
          `${BLACKLIST_PREFIX}${token}`,
          remainingTime,
          '1'
        );
      }
    }
  } catch (error) {
    console.error('Redis 加入黑名单失败:', error);
  }
};

export const isBlacklistedRedis = async (token: string): Promise<boolean> => {
  try {
    const result = await redis.exists(`${BLACKLIST_PREFIX}${token}`);
    return result === 1;
  } catch (error) {
    console.error('Redis 黑名单检查失败:', error);
    return false;
  }
};

export const removeFromBlacklistRedis = async (token: string): Promise<void> => {
  try {
    await redis.del(`${BLACKLIST_PREFIX}${token}`);
  } catch (error) {
    console.error('Redis 从黑名单移除失败:', error);
  }
};
*/

export default {
  addToBlacklist,
  removeFromBlacklist,
  isBlacklisted,
  checkBlacklist,
  getBlacklistStats,
  cleanupExpiredTokens
};
