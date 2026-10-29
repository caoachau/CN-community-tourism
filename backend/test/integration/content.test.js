import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import mysql from 'mysql2/promise';
import sharp from 'sharp';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createTestDatabase } from '../support/mysql.js';
import { testDatabaseOptions } from '../support/config.js';
import { databaseAccess } from '../../src/database.js';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/shared/logger.js';
import { authOptions } from '../../src/config/auth.js';
import { hashPassword } from '../../src/auth/passwords.js';
import { createAuthRepository } from '../../src/auth/repository.js';
import { createAuthService } from '../../src/auth/service.js';
import { createHouseholdRepository } from '../../src/households/repository.js';
import { createHouseholdService } from '../../src/households/service.js';
import { createCatalogRepository } from '../../src/catalog/repository.js';
import { createCatalogService } from '../../src/catalog/service.js';
import { createRoomRepository } from '../../src/rooms/repository.js';
import { createRoomService } from '../../src/rooms/service.js';
import { createServiceRepository } from '../../src/services/repository.js';
import { createServiceService } from '../../src/services/service.js';
import { createContentRepository } from '../../src/content/repository.js';
import { createContentService } from '../../src/content/service.js';
import { createImageStorage } from '../../src/content/storage.js';
import { openApiDocument } from '../../src/openapi.js';
import { insert } from '../support/fixtures.js';

const password = 'Isolated content management test password', requestId = () => randomUUID();
const profile = { title: 'Hộ du lịch hình ảnh', body: 'Gia đình cung cấp các trải nghiệm du lịch cộng đồng và lưu trú.',
  details: { address: 'Ấp Bình Hòa, xã An Bình', locality: 'Vĩnh Long', contactPhone: '0901234567' } };
const ref = data => ({ revisionId: data.profile.revisionId, version: data.profile.version });
const imageRef = data => ({ revisionId: data.revisionId, version: data.version, expectedToken: data.mediaToken });
const ajv = addFormats(new Ajv({ strict: false, allErrors: true }));
let database, pool, authRepository, authService, householdService, catalogService, roomService, serviceService, repository, contentService, storage, directory, server, base, passwordHash, admin, bytes, contract, sequence = 0;

async function account(role = 'CUSTOMER') {
  const user = await authRepository.transaction(tx => tx.createUser({ email: `content-${++sequence}@example.invalid`, displayName: 'Chủ hộ kiểm thử', passwordHash, role }));
  return authService.login({ email: user.email, password });
}
const actor = session => authService.authenticate(session.accessToken);
async function call(url, { method = 'GET', session, body, binary, query } = {}) {
  const uri = new URL(`${base}${url}`);
  for (const [key, value] of Object.entries(query ?? {})) uri.searchParams.set(key, value);
  const response = await fetch(uri, { method, headers: { ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    ...(binary ? { 'Content-Type': 'application/octet-stream' } : body ? { 'Content-Type': 'application/json' } : {}) },
    ...(binary ? { body: binary } : body ? { body: JSON.stringify(body) } : {}) });
  if (response.headers.get('content-type')?.startsWith('image/webp')) return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()), headers: response.headers };
  const payload = await response.json();
  const key = `/api/v1${url.replace(/\/rooms\/\d+/g, '/rooms/{roomId}').replace(/\/services\/\d+/g, '/services/{serviceId}')
    .replace(/\/households\/\d+/g, '/households/{resourceId}').replace(/\/revisions\/\d+/g, '/revisions/{revisionId}').replace(/\/images\/\d+/g, '/images/{imageId}')}`;
  const publicKey = key.replace(/\/public\/(rooms|services)\/\{(?:roomId|serviceId)\}/, '/public/$1/{resourceId}');
  const operation = contract.paths[publicKey]?.[method.toLowerCase()];
  if (operation) {
    const schema = (operation.responses[response.status] ?? operation.responses.default).content['application/json'].schema;
    const validator = ajv.compile(schema); assert.equal(validator(payload), true, JSON.stringify(validator.errors));
  }
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return { status: response.status, data: payload.data, code: payload.error?.code };
}
async function fixture(kind = 'households') {
  const session = await account(), auth = await actor(session);
  let data = await householdService.open(auth, profile, requestId());
  const householdId = data.household.id;
  if (kind === 'households') return { kind, session, auth, data, householdId, base: '/households/me' };
  await householdService.submit(auth, ref(data), requestId());
  await householdService.review(await actor(admin), data.profile.revisionId, { version: 1, decision: 'APPROVED' }, requestId());
  const host = await actor(session);
  let place = await catalogService.createPlace(host, { title: 'Điểm phục vụ kiểm thử', body: profile.body, details: { address: profile.details.address, locality: 'Vĩnh Long' } }, requestId());
  await catalogService.submitPlace(host, place.place.id, ref(place), requestId());
  await catalogService.reviewPlace(await actor(admin), place.profile.revisionId, { version: 1, decision: 'APPROVED' }, requestId());
  let input;
  if (kind === 'rooms') {
    input = { title: 'Phòng hình ảnh', body: profile.body, placeId: place.place.id, maxGuests: 4, nightlyPriceVnd: 400000 };
    data = await roomService.create(host, input, requestId());
  } else {
    const category = await catalogService.createCategory(await actor(admin), { kind: 'SERVICE', code: `MEDIA_${++sequence}`, name: 'Trải nghiệm', isActive: true, reason: 'Kiểm thử nội dung' }, requestId());
    input = { title: 'Dịch vụ hình ảnh', body: profile.body, categoryId: category.category.id, defaultPlaceId: place.place.id, defaultDurationMinutes: 90 };
    data = await serviceService.create(host, input, requestId());
    await serviceService.createOffer(host, data.service.id, { name: 'Gói trải nghiệm', participationMode: 'SHARED', pricingType: 'PER_PERSON', unitPriceVnd: 150000, minParticipants: 1, maxParticipants: 5, terms: { scopeDescription: 'Trọn hoạt động trải nghiệm tại nhà vườn.' } }, requestId());
    data = await serviceService.mine(host, data.service.id);
  }
  const id = data[kind === 'rooms' ? 'room' : 'service'].id;
  return { kind, session, auth: host, data, householdId, id, input, base: `/households/me/${kind}/${id}` };
}
async function upload(f, state) {
  state ??= (await call(`${f.base}/images`, { session: f.session })).data;
  const response = await call(`${f.base}/images`, { method: 'POST', session: f.session, query: imageRef(state), binary: bytes });
  assert.equal(response.status, 201); return response.data;
}
async function publish(f) {
  const api = f.kind === 'households' ? householdService : f.kind === 'rooms' ? roomService : serviceService;
  if (f.kind === 'households') await api.submit(f.auth, ref(f.data), requestId());
  else await api.submit(f.auth, f.id, { ...ref(f.data), ...(f.kind === 'rooms' ? { pricingToken: f.data.room.pricingToken } : { offersToken: f.data.offersToken }) }, requestId());
  f.data = await api.review(await actor(admin), f.data.profile.revisionId, { version: f.data.profile.version, decision: 'APPROVED' }, requestId());
  f.auth = await actor(f.session);
  return f;
}
async function newDraft(f) {
  const api = f.kind === 'households' ? householdService : f.kind === 'rooms' ? roomService : serviceService;
  const input = { ...(f.kind === 'households' ? profile : f.input), ...ref(f.data), title: 'Nội dung cập nhật giữ ảnh cũ' };
  delete input.nightlyPriceVnd;
  f.data = f.kind === 'households' ? await api.save(f.auth, input, requestId()) : await api.save(f.auth, f.id, input, requestId());
  return (await call(`${f.base}/images`, { session: f.session })).data;
}

before(async () => {
  database = await createTestDatabase(process.env, { schema: 'survey' });
  pool = mysql.createPool({ ...testDatabaseOptions(), database: database.name, connectionLimit: 8 });
  const access = databaseAccess(pool);
  authRepository = createAuthRepository(access); passwordHash = await hashPassword(password);
  authService = createAuthService({ repository: authRepository, options: authOptions({ JWT_SECRET: randomBytes(32).toString('base64url') }) });
  householdService = createHouseholdService({ repository: createHouseholdRepository(access) });
  catalogService = createCatalogService({ repository: createCatalogRepository(access) });
  roomService = createRoomService({ repository: createRoomRepository(access) });
  serviceService = createServiceService({ repository: createServiceRepository(access) });
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ctp-content-'));
  storage = createImageStorage({ NODE_ENV: 'test', MEDIA_STORAGE_DIR: directory });
  repository = createContentRepository(access); contentService = createContentService({ repository, storage });
  contract = await SwaggerParser.dereference(structuredClone(openApiDocument), { resolve: { external: false } });
  server = createApp({ logger: createLogger({ env: { LOG_LEVEL: 'silent' } }), authService, householdService, catalogService, roomService, serviceService, contentService }).listen(0);
  await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}/api/v1`;
  admin = await account('ADMIN');
  bytes = await sharp({ create: { width: 64, height: 32, channels: 3, background: '#126644' } }).png().toBuffer();
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool?.end(); await database?.dispose();
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

for (const kind of ['households', 'rooms', 'services']) {
  test(`${kind}: upload, cover, order, moderation, immutable copies and removal work through HTTP`, async () => {
    const f = await fixture(kind);
    let images = await upload(f); assert.equal(images.images[0].isCover, true);
    const first = images.images[0], firstRef = imageRef(images);
    assert.equal((await call(first.url)).status, 404);
    assert.equal((await call(first.url, { session: f.session })).bytes.length, first.sizeBytes);
    assert.equal((await call(first.url, { session: admin })).status, 200);
    images = await upload(f, images);
    const second = images.images[1];
    const stale = await call(`${f.base}/images/order`, { method: 'PUT', session: f.session, body: { ...firstRef, imageIds: images.images.map(i => i.id), coverImageId: first.id } });
    assert.equal(stale.code, 'STALE_VERSION');
    const ordered = await call(`${f.base}/images/order`, { method: 'PUT', session: f.session, body: { ...imageRef(images), imageIds: [second.id, first.id], coverImageId: second.id } });
    assert.equal(ordered.status, 200); assert.deepEqual(ordered.data.images.map(i => i.id), [second.id, first.id]);
    assert.equal(ordered.data.images[0].isCover, true);
    await publish(f);
    const publicPath = `/public/${kind}/${kind === 'households' ? f.householdId : f.id}/images`;
    assert.equal((await call(publicPath)).data.images[0].url, second.url);
    assert.equal((await call(first.url)).headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await call(`/admin/revisions/${f.data.profile.revisionId}/images`, { session: admin })).data.images.length, 2);
    const immutable = await call(`${f.base}/images/${first.id}`, { method: 'DELETE', session: f.session, body: imageRef(ordered.data) });
    assert.equal(immutable.code, 'INVALID_STATE');
    images = await newDraft(f);
    assert.deepEqual(images.images.map(i => i.url), [second.url, first.url]);
    assert.notEqual(images.images[0].id, second.id);
    const removed = await call(`${f.base}/images/${images.images[0].id}`, { method: 'DELETE', session: f.session, body: imageRef(images) });
    assert.equal(removed.status, 200); assert.equal(removed.data.images.length, 1); assert.equal(removed.data.images[0].isCover, true);
    assert.equal((await call(publicPath)).data.images.length, 2);
    await publish(f);
    assert.equal((await call(publicPath)).data.images.length, 1);
    assert.equal((await call(second.url)).status, 404);
    assert.equal((await call(second.url, { session: f.session })).status, 200);
  });

  test(`${kind}: archive and restore preserve records and hide public content and photos`, async () => {
    const f = await fixture(kind), images = await upload(f); await publish(f);
    const url = images.images[0].url, command = { ...ref(f.data), reason: 'Ngừng cung cấp và lưu trữ hồ sơ' };
    const archived = await call(f.base, { method: 'DELETE', session: f.session, body: command });
    assert.equal(archived.status, 200); assert.ok(archived.data.archivedAt);
    assert.equal((await call(f.base, { method: 'DELETE', session: f.session, body: command })).data.changed, false);
    assert.equal((await call(url)).status, 404);
    assert.equal((await call(url, { session: f.session })).status, 200);
    const own = await call(f.base, { session: f.session }); assert.equal(own.status, 200);
    assert.ok(own.data[kind === 'households' ? 'household' : kind === 'rooms' ? 'room' : 'service'].archivedAt);
    const restored = await call(`${f.base}/restore`, { method: 'POST', session: f.session, body: command });
    assert.equal(restored.status, 200); assert.equal(restored.data.archivedAt, null);
    assert.equal((await call(url)).status, 200);
    if (kind !== 'households') assert.equal((await call(`/public/${kind}/${f.id}`)).status, 200);
  });
}

test('untrusted image data, cross-owner revision/IDs, unauthenticated and admin mutations are rejected', async () => {
  const f = await fixture(), other = await fixture(), images = await upload(f), query = imageRef(images);
  assert.equal((await call(`${f.base}/images`, { method: 'POST', query, binary: bytes })).status, 401);
  assert.equal((await call(`${f.base}/images`, { method: 'POST', session: admin, query, binary: bytes })).status, 403);
  assert.equal((await call(`${f.base}/images`, { method: 'POST', session: other.session, query, binary: bytes })).code, 'STALE_VERSION');
  assert.equal((await call(images.images[0].url, { session: other.session })).status, 404);
  assert.equal((await call(`${f.base}/images`, { method: 'POST', session: f.session, query, binary: Buffer.from('fake image') })).code, 'INVALID_IMAGE');
  assert.equal((await call(`${f.base}/images`, { method: 'POST', session: f.session, query, binary: Buffer.alloc(8 * 1024 * 1024 + 1) })).status, 413);
  assert.equal((await call(`${f.base}/images`, { method: 'POST', session: f.session, query, body: { base64: 'fake' } })).status, 415);
  assert.equal((await call(`${f.base}/images/order`, { method: 'PUT', session: f.session, body: { ...query, imageIds: ['9999999'], coverImageId: '9999999' } })).code, 'INVALID_REQUEST');
  assert.equal((await call(f.base, { method: 'DELETE', session: f.session, body: { ...ref(f.data), reason: '' } })).status, 422);
});

test('pending images are immutable; rejected drafts copy pictures without leaking them to the public', async () => {
  const f = await fixture(), images = await upload(f);
  await householdService.submit(f.auth, ref(f.data), requestId());
  assert.equal((await call(`${f.base}/images`, { method: 'POST', session: f.session, query: imageRef(images), binary: bytes })).code, 'INVALID_STATE');
  f.data = await householdService.review(await actor(admin), f.data.profile.revisionId, { version: 1, decision: 'REJECTED', reason: 'Bổ sung thông tin' }, requestId());
  const draft = await newDraft(f); assert.equal(draft.images.length, 1);
  assert.equal((await call(images.images[0].url)).status, 404);
});

test('concurrent image uploads have one winner and discard the losing storage object', async () => {
  const f = await fixture(), state = (await call(`${f.base}/images`, { session: f.session })).data;
  const before = (await fs.readdir(directory)).length;
  const results = await Promise.all([1, 2].map(() => call(`${f.base}/images`, { method: 'POST', session: f.session, query: imageRef(state), binary: bytes })));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  assert.equal((await fs.readdir(directory)).length, before + 1);
});

test('a failed audit rolls back image registration/archive and removes the newly uploaded object', async () => {
  const f = await fixture(), state = (await call(`${f.base}/images`, { session: f.session })).data;
  const failing = createContentService({ storage, repository: { ...repository, transaction: work => repository.transaction(tx => work({ ...tx, event: async () => { throw new Error('test audit failure'); } })) } });
  const count = (await fs.readdir(directory)).length;
  await assert.rejects(failing.upload(f.auth, 'households', undefined, imageRef(state), bytes, requestId()), /test audit failure/);
  assert.equal((await fs.readdir(directory)).length, count);
  assert.equal((await call(`${f.base}/images`, { session: f.session })).data.images.length, 0);
  await assert.rejects(failing.archive(f.auth, 'households', undefined, { ...ref(f.data), reason: 'Lưu trữ' }, true, requestId()), /test audit failure/);
  assert.equal((await call(f.base, { session: f.session })).data.household.archivedAt, null);
});

test('archive and new draft creation serialize and never overwrite a newer revision', async () => {
  const f = await fixture();
  const results = await Promise.all([
    call(f.base, { method: 'DELETE', session: f.session, body: { ...ref(f.data), reason: 'Lưu trữ' } }),
    call(`${f.base}/profile`, { method: 'PUT', session: f.session, body: { ...profile, ...ref(f.data), title: 'Bản sửa đồng thời' } }),
  ]);
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(results.filter(r => r.status === 409).length, 1);
});

test('image limit is enforced under current tokens and removing an image frees a slot', async () => {
  const f = await fixture(); let state;
  for (let index = 0; index < 12; index++) state = await upload(f, state);
  const response = await call(`${f.base}/images`, { method: 'POST', session: f.session, query: imageRef(state), binary: bytes });
  assert.equal(response.code, 'IMAGE_LIMIT');
  const removed = await call(`${f.base}/images/${state.images[0].id}`, { method: 'DELETE', session: f.session, body: imageRef(state) });
  assert.equal(removed.data.images.length, 11);
  assert.equal((await upload(f, removed.data)).images.length, 12);
});

test('room/service ownership, archived parents and live role/session revocation guard every command', async () => {
  const owner = await fixture('rooms'), other = await fixture('services');
  for (const f of [owner, other]) {
    const foreign = f === owner ? other.session : owner.session;
    assert.equal((await call(`${f.base}/images`, { session: foreign })).status, 403);
    assert.equal((await call(f.base, { method: 'DELETE', session: foreign, body: { ...ref(f.data), reason: 'Không phải chủ' } })).status, 403);
  }
  const household = await householdService.mine(owner.auth);
  assert.equal((await call('/households/me', { method: 'DELETE', session: owner.session, body: { ...ref(household), reason: 'Lưu trữ cả hộ' } })).status, 200);
  const state = (await call(`${owner.base}/images`, { session: owner.session })).data;
  assert.equal((await call(`${owner.base}/images`, { method: 'POST', session: owner.session, query: imageRef(state), binary: bytes })).code, 'INVALID_STATE');
  assert.equal((await call(`${owner.base}/restore`, { method: 'POST', session: owner.session, body: { ...ref(owner.data), reason: 'Khôi phục' } })).code, 'INVALID_STATE');
  const stale = other.auth;
  await authService.setAccountStatus(await actor(admin), other.session.user.id, { status: 'BLOCKED', reason: 'Kiểm thử thu hồi' }, requestId());
  await assert.rejects(contentService.archive(stale, 'services', other.id, { ...ref(other.data), reason: 'Sau khi bị khóa' }, true, requestId()), { code: 'ACCOUNT_BLOCKED' });
});

test('archiving a room or its household preserves confirmed reservations and booking snapshots byte-for-byte', async () => {
  const f = await publish(await fixture('rooms'));
  const c = await pool.getConnection();
  let bookingId, setId, itemId, before;
  try {
    bookingId = await insert(c, 'bookings', { household_id: f.householdId, booking_code: `MEDIA-${++sequence}`, created_by: f.session.user.id,
      source: 'OFFLINE', offline_channel: 'PHONE', status: 'CONFIRMED', contact_name: 'Khách cũ', contact_phone: '0000000000',
      check_in_date: '2035-11-20', check_out_date: '2035-11-22', first_starts_at: '2035-11-20 07:00:00', last_ends_at: '2035-11-22 05:00:00',
      total_vnd: 800000, terms_snapshot: { original: true }, confirmed_at: '2035-10-01 00:00:00' });
    setId = await insert(c, 'reservation_sets', { household_id: f.householdId, booking_id: bookingId, status: 'COMMITTED', total_vnd: 800000,
      terms_snapshot: { original: true }, first_starts_at: '2035-11-20 07:00:00', last_ends_at: '2035-11-22 05:00:00' });
    itemId = await insert(c, 'booking_items', { household_id: f.householdId, reservation_set_id: setId, kind: 'ROOM', room_id: f.id,
      participant_count: 4, quantity: 2, pricing_type: 'PER_NIGHT', is_exclusive: 1, check_in_date: '2035-11-20', check_out_date: '2035-11-22',
      unit_price_vnd: 400000, base_amount_vnd: 800000, starts_at: '2035-11-20 07:00:00', ends_at: '2035-11-22 05:00:00', snapshot: f.data });
    await c.execute('UPDATE bookings SET current_reservation_set_id=? WHERE id=?', [setId, bookingId]);
    before = JSON.stringify([(await c.execute('SELECT * FROM bookings WHERE id=?', [bookingId]))[0],
      (await c.execute('SELECT * FROM reservation_sets WHERE id=?', [setId]))[0], (await c.execute('SELECT * FROM booking_items WHERE id=?', [itemId]))[0]]);
  } finally { c.release(); }
  assert.equal((await call(f.base, { method: 'DELETE', session: f.session, body: { ...ref(f.data), reason: 'Ngừng nhận đặt mới' } })).status, 200);
  const h = await householdService.mine(f.auth);
  assert.equal((await call('/households/me', { method: 'DELETE', session: f.session, body: { ...ref(h), reason: 'Lưu trữ cả hộ' } })).status, 200);
  const after = JSON.stringify([(await pool.execute('SELECT * FROM bookings WHERE id=?', [bookingId]))[0],
    (await pool.execute('SELECT * FROM reservation_sets WHERE id=?', [setId]))[0], (await pool.execute('SELECT * FROM booking_items WHERE id=?', [itemId]))[0]]);
  assert.equal(after, before);
});
