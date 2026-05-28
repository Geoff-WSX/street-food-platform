import { Router } from 'express';
import { AuthRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import sharp from 'sharp';
import { qiniuService } from '../services/qiniu.service';

const router = Router();

const memoryStorage = multer.memoryStorage();

const uploadMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  },
});

// 处理图片压缩并上传七牛
async function processUploadImage(buffer: Buffer): Promise<{ original: string; thumbnail: string }> {
  const ts = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const baseKey = `posts/${ts}-${random}`;

  // 原图 — 最大 1920px, 质量 80
  const originalBuffer = await sharp(buffer)
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();

  // 缩略图 — 400px, 质量 70
  const thumbnailBuffer = await sharp(buffer)
    .resize(400, 400, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 70 })
    .toBuffer();

  const originalUrl = await qiniuService.uploadBuffer(`${baseKey}.webp`, originalBuffer);
  const thumbnailUrl = await qiniuService.uploadBuffer(`thumbnails/${ts}-${random}.webp`, thumbnailBuffer);

  return { original: originalUrl, thumbnail: thumbnailUrl };
}

// 通用上传接口 - 支持小程序使用
router.post('/', authenticate, uploadMiddleware.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, '没有上传文件', 'NO_FILE');
    }

    const result = await processUploadImage(req.file.buffer);

    return successResponse(res, {
      url: result.original,
      thumbnail: result.thumbnail,
    }, '上传成功');
  } catch (error: any) {
    console.error('上传错误:', error);
    return errorResponse(res, error.message || '上传失败', 'UPLOAD_FAILED');
  }
});

export default router;