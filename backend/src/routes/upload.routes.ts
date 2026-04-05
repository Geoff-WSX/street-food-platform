import { Router } from 'express';
import { AuthRequest } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/posts');
const thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// 配置磁盘存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage,
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

// 处理图片压缩
async function processUploadImage(inputPath: string): Promise<{ original: string; thumbnail: string }> {
  const baseFilename = path.basename(inputPath, path.extname(inputPath));
  const uniqueFilename = `${baseFilename}-${Date.now()}`;

  // 原图路径 - 使用新文件名避免冲突
  const originalPath = path.join(uploadDir, `${uniqueFilename}.webp`);
  // 缩略图路径
  const thumbPath = path.join(thumbnailDir, `${uniqueFilename}.webp`);

  // 处理原图 - 最大 1920px, 质量 80
  await sharp(inputPath)
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(originalPath);

  // 处理缩略图 - 400px, 质量 70
  await sharp(inputPath)
    .resize(400, 400, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 70 })
    .toFile(thumbPath);

  // 删除原始上传文件
  fs.unlinkSync(inputPath);

  return {
    original: `posts/${uniqueFilename}.webp`,
    thumbnail: `thumbnails/${uniqueFilename}.webp`,
  };
}

// 通用上传接口 - 支持小程序使用
router.post('/', authenticate, uploadMiddleware.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, '没有上传文件', 'NO_FILE');
    }

    // 处理图片
    const result = await processUploadImage(req.file.path);

    return successResponse(res, {
      url: `/uploads/${result.original}`,
      thumbnail: `/uploads/${result.thumbnail}`,
    }, '上传成功');
  } catch (error: any) {
    console.error('上传错误:', error);
    return errorResponse(res, error.message || '上传失败', 'UPLOAD_FAILED');
  }
});

export default router;
