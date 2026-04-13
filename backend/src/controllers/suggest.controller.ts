import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { pinyin } from 'pinyin-pro';
import prisma from '../services/db/prisma';

// 缓存搜索建议（5分钟更新一次）
let suggestionsCache: any[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

/**
 * 构建搜索建议
 * 从数据库中提取常见的关键词（用户名、地点等）
 */
async function buildSuggestions() {
  const now = Date.now();
  if (suggestionsCache.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return suggestionsCache;
  }

  try {
    // 获取最近的动态中的地点
    const posts = await prisma.post.findMany({
      where: {
        address: { not: null },
        isPrivate: false,
      },
      select: {
        address: true,
      },
      take: 1000,
      orderBy: { createdAt: 'desc' },
    });

    // 提取城市和地点关键词
    const locationSet = new Set<string>();

    for (const post of posts) {
      if (!post.address) continue;

      const addr = post.address;

      // 提取城市名（通常是2-4个字）
      const cityMatch = addr.match(/([^\x00-\xff]{2,4})市/);
      if (cityMatch) {
        locationSet.add(cityMatch[1] + '市');
      }

      // 提取区名
      const districtMatch = addr.match(/([^\x00-\xff]{2,4})区/);
      if (districtMatch) {
        locationSet.add(districtMatch[1] + '区');
      }

      // 如果地址不长，整个添加
      if (addr.length <= 10 && addr.length >= 2) {
        locationSet.add(addr);
      }
    }

    // 添加常见城市
    const commonCities = [
      '北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市',
      '重庆市', '武汉市', '西安市', '南京市', '苏州市', '天津市',
      '长沙市', '郑州市', '东莞市', '青岛市', '沈阳市', '宁波市',
      '佛山市', '厦门市', '合肥市', '大连市', '福州市', '济南市',
      '哈尔滨市', '长春市', '石家庄市', '南宁市', '贵阳市', '南昌市',
      '昆明市', '太原市', '兰州市', '呼和浩特市', '银川市', '西宁市',
      '乌鲁木齐市', '拉萨市', '海口市', '三亚市'
    ];

    for (const city of commonCities) {
      locationSet.add(city);
    }

    // 获取活跃用户名
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { username: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    const userSet = new Set<string>();
    for (const user of users) {
      if (user.username && user.username.length >= 2) {
        userSet.add(user.username);
      }
    }

    // 构建建议列表
    const suggestions: any[] = [];

    // 添加地点建议
    for (const loc of locationSet) {
      const fullPinyin = pinyin(loc, { toneType: 'none', type: 'array' }).join('');
      const firstLetters = pinyin(loc, { pattern: 'first', toneType: 'none', type: 'array' }).join('');

      suggestions.push({
        text: loc,
        type: 'location',
        pinyin: fullPinyin,
        abbr: firstLetters,
      });
    }

    // 添加用户建议
    for (const username of userSet) {
      const fullPinyin = pinyin(username, { toneType: 'none', type: 'array' }).join('');
      const firstLetters = pinyin(username, { pattern: 'first', toneType: 'none', type: 'array' }).join('');

      suggestions.push({
        text: username,
        type: 'user',
        pinyin: fullPinyin,
        abbr: firstLetters,
      });
    }

    suggestionsCache = suggestions;
    cacheTimestamp = now;

    console.log(`构建搜索建议完成: ${suggestions.length} 条`);
    return suggestions;
  } catch (error) {
    console.error('构建搜索建议失败:', error);
    return [];
  }
}

/**
 * 搜索建议接口
 * GET /api/suggest?q=hang
 */
export const searchSuggestions = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length < 1) {
      return successResponse(res, []);
    }

    const keyword = query.trim().toLowerCase();
    const suggestions = await buildSuggestions();

    // 过滤匹配的建议（前缀匹配）
    const matches = suggestions.filter((item) => {
      // 原文前缀匹配
      if (item.text.startsWith(keyword)) {
        return true;
      }

      // 拼音前缀匹配
      if (item.pinyin.startsWith(keyword)) {
        return true;
      }

      // 首字母前缀匹配
      if (item.abbr.startsWith(keyword)) {
        return true;
      }

      return false;
    }).slice(0, 10); // 最多返回10条

    return successResponse(res, matches);
  } catch (error: any) {
    console.error('获取搜索建议失败:', error);
    return errorResponse(res, error.message, 'SUGGEST_FAILED', 500);
  }
};

/**
 * 刷新建议缓存
 * POST /api/suggest/refresh
 */
export const refreshSuggestions = async (req: Request, res: Response) => {
  try {
    suggestionsCache = [];
    cacheTimestamp = 0;
    await buildSuggestions();
    return successResponse(res, { message: '缓存已刷新' });
  } catch (error: any) {
    return errorResponse(res, error.message, 'REFRESH_FAILED', 500);
  }
};
