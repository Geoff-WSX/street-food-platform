import fs from 'fs';
import path from 'path';

/**
 * 内容审核服务
 *
 * 提供自动内容审核功能，支持：
 * - 敏感词过滤（基于配置文件）
 * - 可扩展的 AI 审核接口
 */

const MODERATION_CONFIG_PATH = path.join(__dirname, '../../config/moderation.json');

/**
 * 审核配置缓存
 */
interface ModerationConfig {
  enabled: boolean;
  autoReject: boolean;        // 自动拒绝违规内容
  logViolations: boolean;     // 记录违规内容
  minContentLength: number;   // 最小内容长度
  maxContentLength: number;  // 最大内容长度
  customRules: CustomRule[];  // 自定义审核规则
}

interface CustomRule {
  pattern: string;
  action: 'reject' | 'warn' | 'allow';
  message: string;
}

interface ModerationResult {
  passed: boolean;
  score: number;              // 0-100, 100 = 完全合规
  violations: Violation[];
 建议?: string;
}

interface Violation {
  type: 'sensitive' | 'spam' | 'custom' | 'length';
  word?: string;
  message: string;
}

let cachedConfig: ModerationConfig | null = null;
let configLastLoad = 0;
const CONFIG_CACHE_TTL = 60 * 1000; // 1分钟缓存

/**
 * 加载审核配置
 */
const loadConfig = (): ModerationConfig => {
  const now = Date.now();

  if (cachedConfig && (now - configLastLoad) < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const data = fs.readFileSync(MODERATION_CONFIG_PATH, 'utf-8');
    cachedConfig = JSON.parse(data);
    configLastLoad = now;
  } catch {
    // 使用默认配置
    cachedConfig = {
      enabled: true,
      autoReject: true,
      logViolations: true,
      minContentLength: 1,
      maxContentLength: 5000,
      customRules: [],
    };
  }

  return cachedConfig!;
};

/**
 * 基础敏感词检查
 */
const checkSensitiveWords = (text: string): Violation[] => {
  const violations: Violation[] = [];
  const sensitiveWordsPath = path.join(__dirname, '../../config/sensitiveWords.json');

  try {
    const data = fs.readFileSync(sensitiveWordsPath, 'utf-8');
    const config = JSON.parse(data);
    const words: string[] = Array.isArray(config.sensitiveWords) ? config.sensitiveWords : [];

    for (const word of words) {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(text)) {
        violations.push({
          type: 'sensitive',
          word,
          message: `内容包含敏感词: ${word}`,
        });
      }
    }
  } catch (error) {
    console.error('[Moderation] Failed to load sensitive words:', error);
  }

  return violations;
};

/**
 * 检查内容长度
 */
const checkLength = (text: string, config: ModerationConfig): Violation[] => {
  const violations: Violation[] = [];

  if (text.length < config.minContentLength) {
    violations.push({
      type: 'length',
      message: `内容过短，最少需要 ${config.minContentLength} 个字符`,
    });
  }

  if (text.length > config.maxContentLength) {
    violations.push({
      type: 'length',
      message: `内容过长，最多允许 ${config.maxContentLength} 个字符`,
    });
  }

  return violations;
};

/**
 * 应用自定义规则
 */
const checkCustomRules = (text: string, config: ModerationConfig): Violation[] => {
  const violations: Violation[] = [];

  for (const rule of config.customRules) {
    try {
      const regex = new RegExp(rule.pattern, 'gi');
      if (regex.test(text)) {
        violations.push({
          type: 'custom',
          word: rule.pattern,
          message: rule.message || `内容违反自定义规则: ${rule.pattern}`,
        });
      }
    } catch {
      // 无效的正则表达式，跳过
    }
  }

  return violations;
};

/**
 * 检测垃圾内容（简单实现）
 * - 重复字符检测
 * - 重复词组检测
 */
const checkSpam = (text: string): Violation[] => {
  const violations: Violation[] = [];

  // 检测重复字符（如 "啊啊啊"）
  if (/(.)\1{4,}/.test(text)) {
    violations.push({
      type: 'spam',
      message: '内容包含过多重复字符',
    });
  }

  // 检测重复词组（如 "好吃好吃好吃"）
  const repeatedPhrases = text.match(/(.{2,})\1{2,}/g);
  if (repeatedPhrases) {
    violations.push({
      type: 'spam',
      message: '内容包含重复词组',
    });
  }

  return violations;
};

/**
 * 审核内容
 * @param text 内容文本
 * @param options 审核选项
 * @returns 审核结果
 */
export const moderateContent = (
  text: string,
  options?: { skipSensitive?: boolean; skipSpam?: boolean }
): ModerationResult => {
  const config = loadConfig();

  if (!config.enabled) {
    return {
      passed: true,
      score: 100,
      violations: [],
    };
  }

  const allViolations: Violation[] = [];

  // 1. 长度检查（必做）
  allViolations.push(...checkLength(text, config));

  // 2. 敏感词检查
  if (!options?.skipSensitive) {
    allViolations.push(...checkSensitiveWords(text));
  }

  // 3. 垃圾内容检测
  if (!options?.skipSpam) {
    allViolations.push(...checkSpam(text));
  }

  // 4. 自定义规则检查
  allViolations.push(...checkCustomRules(text, config));

  // 计算通过状态和评分
  const passed = allViolations.length === 0 ||
    allViolations.every(v => v.type !== 'sensitive');

  // 根据违规严重程度计算评分
  let score = 100;
  for (const v of allViolations) {
    switch (v.type) {
      case 'sensitive':
        score -= 50; // 敏感词严重扣分
        break;
      case 'spam':
        score -= 20;
        break;
      case 'length':
        score -= 10;
        break;
      case 'custom':
        score -= 15;
        break;
    }
  }
  score = Math.max(0, score);

  // 记录违规日志
  if (config.logViolations && allViolations.length > 0) {
    console.log('[Moderation] Violations detected:', {
      violations: allViolations,
      text: text.substring(0, 100),
      timestamp: new Date().toISOString(),
    });
  }

  return {
    passed,
    score,
    violations: allViolations,
    建议: passed ? undefined : '请修改内容后重试',
  };
};

/**
 * 快速检查内容是否包含敏感词
 * 用于需要快速判断的场景
 */
export const quickCheck = (text: string): boolean => {
  const violations = checkSensitiveWords(text);
  return violations.length === 0;
};

/**
 * 刷新配置缓存
 * 用于配置更新后强制重新加载
 */
export const refreshConfig = (): void => {
  cachedConfig = null;
  configLastLoad = 0;
  loadConfig();
};

export default {
  moderateContent,
  quickCheck,
  refreshConfig,
};
