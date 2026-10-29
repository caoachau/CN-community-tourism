import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../shared/errors.js';
import { MAX_UPLOAD_BYTES } from './images.js';

export const validObjectKey = key => typeof key === 'string' && /^[a-f0-9-]{36}\.webp$/.test(key);
let activeDecoders = 0;
export async function normalizeImage(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length) throw new AppError('INVALID_IMAGE');
  if (bytes.length > MAX_UPLOAD_BYTES) throw new AppError('PAYLOAD_TOO_LARGE');
  if (activeDecoders >= 2) throw new AppError('RATE_LIMITED');
  activeDecoders++;
  try {
    const input = sharp(bytes, { limitInputPixels: 25000000, failOn: 'warning', animated: false });
    const metadata = await input.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error();
    // Re-encode pixels and remove EXIF/GPS metadata.
    return await input.rotate().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch { throw new AppError('INVALID_IMAGE'); }
  finally { activeDecoders--; }
}
export function createImageStorage(env = process.env) {
  const provider = env.MEDIA_STORAGE_DRIVER ?? (env.NODE_ENV === 'production' ? 's3' : 'local');
  const directory = path.resolve(env.MEDIA_STORAGE_DIR || fileURLToPath(new URL('../../storage/media/', import.meta.url)));
  const bucket = env.MEDIA_S3_BUCKET;
  const configured = provider === 'local' ? (env.NODE_ENV !== 'production' || Boolean(env.MEDIA_STORAGE_DIR)) :
    provider === 's3' && Boolean(bucket && env.MEDIA_S3_REGION && env.MEDIA_S3_ACCESS_KEY_ID && env.MEDIA_S3_SECRET_ACCESS_KEY);
  const client = configured && provider === 's3' ? new S3Client({
    region: env.MEDIA_S3_REGION, endpoint: env.MEDIA_S3_ENDPOINT || undefined,
    forcePathStyle: env.MEDIA_S3_FORCE_PATH_STYLE === 'true', maxAttempts: 2,
    credentials: { accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID, secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY },
    requestHandler: { requestTimeout: 20000, connectionTimeout: 5000 },
  }) : null;
  const keyPath = key => {
    if (!validObjectKey(key)) throw new AppError('NOT_FOUND');
    return path.join(directory, key);
  };
  const ready = () => { if (!configured) throw new AppError('MEDIA_STORAGE_UNAVAILABLE'); };
  return {
    async put(bytes) {
      ready(); const key = `${randomUUID()}.webp`;
      try {
        if (provider === 'local') {
          await fs.mkdir(directory, { recursive: true });
          await fs.writeFile(keyPath(key), bytes, { flag: 'wx' });
        } else await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: 'image/webp' }));
        return { key, provider, size: bytes.length };
      } catch { throw new AppError('MEDIA_STORAGE_UNAVAILABLE'); }
    },
    async get(key, storedProvider) {
      keyPath(key); ready();
      if (storedProvider !== provider) throw new AppError('MEDIA_STORAGE_UNAVAILABLE');
      try {
        if (provider === 'local') return await fs.readFile(keyPath(key));
        const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return Buffer.from(await response.Body.transformToByteArray());
      } catch (error) {
        if (error.code === 'ENOENT' || error.name === 'NoSuchKey') throw new AppError('NOT_FOUND');
        throw new AppError('MEDIA_STORAGE_UNAVAILABLE');
      }
    },
    async remove(file) {
      keyPath(file.key); ready();
      if (file.provider !== provider) throw new AppError('MEDIA_STORAGE_UNAVAILABLE');
      if (provider === 'local') await fs.rm(keyPath(file.key), { force: true });
      else await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: file.key }));
    },
  };
}
