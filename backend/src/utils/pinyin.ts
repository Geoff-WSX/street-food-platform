import { pinyin } from 'pinyin-pro';

/**
 * 获取中文的拼音和首字母变体
 * @param text 输入文本
 * @returns 包含原文、完整拼音和首字母的数组
 */
export function getPinyinVariations(text: string): string[] {
  if (!text) return [''];

  // 获取完整拼音（无声调）
  const fullPinyin = pinyin(text, { toneType: 'none', type: 'array' }).join('');

  // 获取首字母
  const firstLetters = pinyin(text, { pattern: 'first', toneType: 'none', type: 'array' }).join('');

  // 去重并返回
  const variations = [text];
  if (fullPinyin && fullPinyin !== text) {
    variations.push(fullPinyin);
  }
  if (firstLetters && firstLetters !== text && firstLetters !== fullPinyin) {
    variations.push(firstLetters);
  }

  return variations;
}

/**
 * 构建拼音搜索条件
 * 为 Prisma 查询生成 OR 条件数组
 * @param fields 要搜索的字段名数组
 * @param keyword 搜索关键词
 * @returns Prisma WHERE 条件数组
 */
export function buildPinyinSearchCondition(fields: string[], keyword: string): any[] {
  const variations = getPinyinVariations(keyword);
  const conditions: any[] = [];

  for (const field of fields) {
    for (const variation of variations) {
      conditions.push({ [field]: { contains: variation } });
    }
  }

  return conditions;
}
