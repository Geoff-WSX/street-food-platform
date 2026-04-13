/**
 * 图片解析工具
 * 处理后端返回的 images 字段（可能是 JSON 字符串数组或已解析的数组）
 */

/**
 * 将 images 字段解析为数组
 * @param images - 字符串（JSON 数组）或数组
 * @returns 图片 URL 数组
 */
export function parseImages(images: string | string[] | undefined | null): string[] {
  if (!images) return [];

  // 如果已经是数组，直接返回
  if (Array.isArray(images)) {
    return images.filter(Boolean);
  }

  // 如果是字符串，尝试解析 JSON
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
      // 如果解析结果不是数组，返回空数组
      return [];
    } catch {
      // JSON 解析失败，尝试按逗号分割
      return images.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  return [];
}

/**
 * 获取第一张图片
 * @param images - 字符串（JSON 数组）或数组
 * @returns 第一张图片 URL，如果没有则返回 undefined
 */
export function getFirstImage(images: string | string[] | undefined | null): string | undefined {
  const parsed = parseImages(images);
  return parsed[0];
}

/**
 * 获取图片数量
 * @param images - 字符串（JSON 数组）或数组
 * @returns 图片数量
 */
export function getImageCount(images: string | string[] | undefined | null): number {
  return parseImages(images).length;
}

/**
 * 获取用户头像 URL
 * 优先使用 avatarData (Base64)，其次使用 avatar (路径)
 * @param user - 用户对象
 * @returns 头像 URL 或 Base64 数据
 */
export function getAvatarUrl(user: { avatar?: string | null; avatarData?: string | null; username?: string } | undefined | null): string {
  if (!user) return 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';

  // 优先使用 Base64 数据
  if (user.avatarData && user.avatarData.trim()) {
    return user.avatarData;
  }

  // 使用路径
  if (user.avatar && user.avatar.trim()) {
    // 如果是完整的 URL 或 Base64，直接返回
    if (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) {
      return user.avatar;
    }
    // 否则拼接后端地址
    return `http://localhost:3000${user.avatar}`;
  }

  // 默认头像
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'default'}`;
}
