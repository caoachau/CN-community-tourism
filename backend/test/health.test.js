import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/shared/logger.js';

const logger = createLogger({ env: { LOG_LEVEL: 'silent' } });

let server;
let baseUrl;

before(async () => {
  server = createApp({ logger }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint reports liveness', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ok');
  assert.equal(body.data.service, 'community-tourism-api');
  assert.doesNotThrow(() => new Date(body.data.timestamp).toISOString());
});

test('unknown route returns a structured 404', async () => {
  const response = await fetch(`${baseUrl}/missing`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('readiness fails closed without a configured database', async () => {
  const response = await fetch(`${baseUrl}/api/ready`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'DATABASE_UNAVAILABLE');
});

test('readiness tracks database failures and recovery without leaking details', async () => {
  let unavailable = false;
  const instance = createApp({ logger, checkDatabase: async () => {
    if (unavailable) throw new Error('sensitive-connection-string');
  } }).listen(0);
  await new Promise((resolve) => instance.once('listening', resolve));
  const url = `http://127.0.0.1:${instance.address().port}/api/ready`;
  try {
    assert.equal((await fetch(url)).status, 200);
    unavailable = true;
    const failed = await fetch(url);
    assert.equal(failed.status, 503);
    assert.equal(failed.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await failed.text(), /sensitive-connection-string/);
    unavailable = false;
    assert.equal((await fetch(url)).status, 200);
  } finally {
    await new Promise((resolve, reject) => instance.close((error) => error ? reject(error) : resolve()));
  }
});
