import multer from 'multer';
import sharp from 'sharp';
import { qiniuService } from '../services/qiniu.service';

// 文件过滤器（只允许图片）
const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG、PNG、GIF、WEBP 格式的图片'));
  }
};

// 内存存储（不再写入本地磁盘）
const memoryStorage = multer.memoryStorage();

// 自定义头像上传处理
export const uploadAvatar = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('avatar');

// 自定义动态图片上传处理
export const uploadPostImages = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
}).array('images', 9);

// 处理头像上传 — Sharp 压缩后上传七牛
export async function processAvatarUpload(file: Express.Multer.File, userId: number): Promise<string> {
  const compressedBuffer = await sharp(file.buffer)
    .resize(400, 400, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();

  const key = `avatars/${userId}-${Date.now()}.webp`;
  return await qiniuService.uploadBuffer(key, compressedBuffer);
}

// 处理动态图片上传 — 返回原图和缩略图 CDN URL
export async function processPostImageUpload(file: Express.Multer.File): Promise<{
  original: string;
  thumbnail: string;
}> {
  const ts = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const baseKey = `posts/${ts}-${random}`;

  // 原图 — 最大 1920px, 质量 80
  const originalBuffer = await sharp(file.buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // 缩略图 — 400px, 质量 70
  const thumbnailBuffer = await sharp(file.buffer)
    .resize(400, 400, { fit: 'cover', position: 'centre' })
    .webp({ quality: 70 })
    .toBuffer();

  const originalUrl = await qiniuService.uploadBuffer(`${baseKey}.webp`, originalBuffer);
  const thumbnailUrl = await qiniuService.uploadBuffer(`thumbnails/${ts}-${random}.webp`, thumbnailBuffer);

  return { original: originalUrl, thumbnail: thumbnailUrl };
}

// 批量处理动态图片
export async function processPostImagesUpload(files: Express.Multer.File[]): Promise<{
  original: string[];
  thumbnail: string[];
}> {
  const results = await Promise.all(files.map(file => processPostImageUpload(file)));

  return {
    original: results.map(r => r.original),
    thumbnail: results.map(r => r.thumbnail),
  };
}

// 获取缩略图 URL（兼容旧数据）
export function getThumbnailUrl(originalUrl: string): string {
  if (originalUrl.startsWith('http')) {
    // 七牛 CDN URL — 替换 posts/ 为 thumbnails/
    return originalUrl.replace('/posts/', '/thumbnails/');
  }
  // 旧数据相对路径
  return originalUrl.replace('/posts/', '/thumbnails/');
}

// 获取不同尺寸的图片 URL
export function getImageUrls(originalUrl: string): {
  original: string;
  thumbnail: string;
} {
  return {
    original: originalUrl,
    thumbnail: getThumbnailUrl(originalUrl),
  };
}