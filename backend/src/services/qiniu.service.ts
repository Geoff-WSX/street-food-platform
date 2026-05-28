import 'dotenv/config';
import * as qiniu from 'qiniu';

const ACCESS_KEY = process.env.QINIU_ACCESS_KEY || '';
const SECRET_KEY = process.env.QINIU_SECRET_KEY || '';
const BUCKET = process.env.QINIU_BUCKET || '';
const DOMAIN = (process.env.QINIU_DOMAIN || '').replace(/\/$/, '');

const mac = new qiniu.auth.digest.Mac(ACCESS_KEY, SECRET_KEY);
const config = new qiniu.conf.Config();
config.zone = qiniu.zone.Zone_z2; // 华南区

const formUploader = new qiniu.form_up.FormUploader(config);
const bucketManager = new qiniu.rs.BucketManager(mac, config);

function generateUploadToken(): string {
  const putPolicy = new qiniu.rs.PutPolicy({ scope: BUCKET });
  return putPolicy.uploadToken(mac);
}

function getPublicUrl(key: string): string {
  return `${DOMAIN}/${key}`;
}

async function uploadBuffer(key: string, buffer: Buffer): Promise<string> {
  // 创建 buffer 副本避免被修改
  const bufferCopy = Buffer.from(buffer);
  const token = generateUploadToken();
  const extra = new qiniu.form_up.PutExtra();

  return new Promise((resolve, reject) => {
    formUploader.put(token, key, bufferCopy, extra, (err, body, info) => {
      if (err) {
        reject(err);
        return;
      }
      if (info.statusCode === 200) {
        resolve(getPublicUrl(key));
      } else {
        reject(new Error(`Qiniu upload failed: ${info.statusCode} ${info.statusMessage}`));
      }
    });
  });
}

async function deleteFile(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    bucketManager.delete(BUCKET, key, (err, body, info) => {
      if (err) {
        reject(err);
        return;
      }
      // 612 = file not exist, treat as success
      if (info.statusCode === 200 || info.statusCode === 612) {
        resolve();
      } else {
        reject(new Error(`Qiniu delete failed: ${info.statusCode}`));
      }
    });
  });
}

function extractKeyFromUrl(url: string): string | null {
  if (!url.startsWith(DOMAIN)) return null;
  return url.slice(DOMAIN.length + 1);
}

export const qiniuService = {
  uploadBuffer,
  deleteFile,
  getPublicUrl,
  extractKeyFromUrl,
};
