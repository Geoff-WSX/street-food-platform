import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// 确保上传目录存在
const ensureDirectoryExists = (directory: string) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// 头像上传目录
const avatarUploadDir = path.join(__dirname, '../../uploads/avatars');
// 动态图片上传目录
const postUploadDir = path.join(__dirname, '../../uploads/posts');
// 缩略图目录
const thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');

// 确保所有目录存在
ensureDirectoryExists(avatarUploadDir);
ensureDirectoryExists(postUploadDir);
ensureDirectoryExists(thumbnailDir);

// 压缩和调整图片大小
async function processImage(
  inputPath: string,
  outputPath: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    thumbnail?: boolean;
    deleteInput?: boolean; // 新增选项：是否删除输入文件
  } = {}
): Promise<string> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 80, thumbnail = false, deleteInput = true } = options;

  let pipeline = sharp(inputPath);

  // 调整大小
  if (thumbnail) {
    pipeline = pipeline.resize(400, 400, {
      fit: 'cover',
      position: 'centre',
    });
  } else {
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // 转换为 WebP 格式并压缩
  pipeline = pipeline.webp({ quality });

  await pipeline.toFile(outputPath);

  // 根据选项决定是否删除原始文件
  if (deleteInput) {
    fs.unlinkSync(inputPath);
  }

  return outputPath.replace(/\\/g, '/').split('/uploads/')[1];
}

// 头像上传配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    // 先保存为临时文件
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

// 动态图片上传配置
const postImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, postUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    // 先保存为临时文件
    cb(null, `post-${uniqueSuffix}${ext}`);
  },
});

// 文件过滤器（只允许图片）
const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG、PNG、GIF、WEBP 格式的图片'));
  }
};

// 自定义头像上传处理
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('avatar');

// 自定义动态图片上传处理
export const uploadPostImages = multer({
  storage: postImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
}).array('images', 9);

// 处理头像上传
export async function processAvatarUpload(file: Express.Multer.File): Promise<string> {
  const outputPath = path.join(avatarUploadDir, file.filename.replace(/\.[^.]+$/, '.webp'));
  return await processImage(file.path, outputPath, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 85,
  });
}

// 处理动态图片上传（返回原图和缩略图路径）
export async function processPostImageUpload(file: Express.Multer.File): Promise<{
  original: string;
  thumbnail: string;
}> {
  const baseFilename = file.filename.replace(/\.[^.]+$/, '');

  console.log('[DEBUG] Processing image upload:', {
    originalFilename: file.filename,
    baseFilename,
    filePath: file.path,
    postUploadDir,
    thumbnailDir
  });

  // 处理原图 - 不删除输入文件，因为还要用它生成缩略图
  const originalFullPath = path.join(postUploadDir, `${baseFilename}.webp`);
  console.log('[DEBUG] Original full path:', originalFullPath);

  const originalRelativePath = await processImage(file.path, originalFullPath, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 80,
    deleteInput: false, // 不删除原始上传的文件
  });

  console.log('[DEBUG] Original processed, now processing thumbnail');

  // 处理缩略图 - 使用原图作为输入，不删除原图
  const thumbnailFullPath = path.join(thumbnailDir, `${baseFilename}.webp`);
  console.log('[DEBUG] Thumbnail full path:', thumbnailFullPath);

  const thumbnailRelativePath = await processImage(
    originalFullPath,
    thumbnailFullPath,
    {
      thumbnail: true,
      quality: 70,
      deleteInput: false, // 不删除原图
    }
  );

  console.log('[DEBUG] Thumbnail processed');

  // 现在可以安全删除原始上传的临时文件了
  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
    console.log('[DEBUG] Deleted original temp file');
  }

  return { original: originalRelativePath, thumbnail: thumbnailRelativePath };
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

// 获取缩略图 URL
export function getThumbnailUrl(originalUrl: string): string {
  return originalUrl.replace('/posts/', '/thumbnails/');
}

// 获取不同尺寸的图片 URL
export function getImageUrls(originalUrl: string): {
  original: string;
  thumbnail: string;
  medium?: string;
} {
  return {
    original: originalUrl,
    thumbnail: getThumbnailUrl(originalUrl),
  };
}