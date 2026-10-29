import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { normalizeImage, createImageStorage } from '../src/content/storage.js';
import { imageOrderSchema } from '../src/content/schemas.js';
import { mediaToken } from '../src/content/images.js';

test('images are decoded, oriented, resized and stripped of identifying metadata', async () => {
  const original = await sharp({ create: { width: 2500, height: 20, channels: 3, background: '#aabbcc' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const output = await normalizeImage(original), metadata = await sharp(output).metadata();
  assert.equal(metadata.format, 'webp');
  assert.ok(metadata.width <= 2000 && metadata.height <= 2000);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
});

test('invalid, truncated, oversized and non-raster image inputs are rejected', async () => {
  for (const input of [Buffer.alloc(0), Buffer.from('not a real image'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')]) {
    await assert.rejects(normalizeImage(input), { code: 'INVALID_IMAGE' });
  }
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'red' } }).png().toBuffer();
  await assert.rejects(normalizeImage(png.subarray(0, 40)), { code: 'INVALID_IMAGE' });
  await assert.rejects(normalizeImage(Buffer.alloc(8 * 1024 * 1024 + 1)), { code: 'PAYLOAD_TOO_LARGE' });
  const bomb = await sharp({ create: { width: 5001, height: 5000, channels: 3, background: 'red' } }).png().toBuffer();
  await assert.rejects(normalizeImage(bomb), { code: 'INVALID_IMAGE' });
});

test('local image storage uses immutable random keys and refuses traversal or unconfigured production storage', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ctp-media-'));
  try {
    const storage = createImageStorage({ NODE_ENV: 'test', MEDIA_STORAGE_DIR: directory });
    const first = await storage.put(Buffer.from('first')), second = await storage.put(Buffer.from('second'));
    assert.notEqual(first.key, second.key);
    assert.equal((await storage.get(first.key, 'local')).toString(), 'first');
    await assert.rejects(storage.get('../secret', 'local'), { code: 'NOT_FOUND' });
    await storage.remove(first);
    await assert.rejects(storage.get(first.key, 'local'), { code: 'NOT_FOUND' });
    await assert.rejects(createImageStorage({ NODE_ENV: 'production' }).put(Buffer.from('data')), { code: 'MEDIA_STORAGE_UNAVAILABLE' });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('image decoder rejects overload without queuing unbounded image buffers', async () => {
  const input = await sharp({ create: { width: 50, height: 50, channels: 3, background: 'blue' } }).png().toBuffer();
  const first = normalizeImage(input), second = normalizeImage(input);
  await assert.rejects(normalizeImage(input), { code: 'RATE_LIMITED' });
  await Promise.all([first, second]);
});

test('image ordering requires a unique full list and one cover; media tokens detect reordering and deletion', () => {
  const reference = { revisionId: '1', version: 1, expectedToken: 'a'.repeat(64) };
  for (const input of [{ imageIds: ['1', '1'], coverImageId: '1' }, { imageIds: ['1'], coverImageId: '2' }, { imageIds: [], coverImageId: '1' }]) {
    assert.equal(imageOrderSchema.safeParse({ ...reference, ...input }).success, false);
  }
  assert.equal(imageOrderSchema.safeParse({ ...reference, imageIds: [], coverImageId: null }).success, true);
  const rows = [1, 2].map((id, index) => ({ id: String(id), object_key: `image-${id}`, sort_order: index, is_cover: index === 0, caption: null }));
  assert.notEqual(mediaToken(rows), mediaToken([...rows].reverse()));
  assert.notEqual(mediaToken(rows), mediaToken(rows.slice(1)));
});
