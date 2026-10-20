import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Router } from 'express';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { openApiDocument } from '../src/openapi.js';
import { ERROR_DEFINITIONS } from '../src/shared/errors.js';
import { createLogger } from '../src/shared/logger.js';
import { validate } from '../src/shared/validation.js';

const logger = createLogger({ env: { LOG_LEVEL: 'silent' } });
let server;
let baseUrl;
let unavailable = false;
let document;
const ajv = addFormats(new Ajv({ strict: false, allErrors: true }));

before(async () => {
  // Resolve only the local document; contract tests must not fetch external refs.
  document = await SwaggerParser.validate(structuredClone(openApiDocument), { resolve: { external: false } });
  const router = Router();
  router.post('/contract-check', validate({ body: z.strictObject({ count: z.number().min(1) }) }));
  server = createApp({
    logger, docsEnabled: true, apiRouter: router,
    checkDatabase: async () => { if (unavailable) throw new Error('SECRET_DATABASE'); },
  }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function assertContract(schema, body) {
  const validator = ajv.compile(schema);
  assert.equal(validator(body), true, JSON.stringify(validator.errors));
}

test('OpenAPI is valid with resolved references and documents implemented system and auth operations', async () => {
  assert.equal(document.openapi, '3.0.3');
  assert.deepEqual(Object.keys(document.paths).sort(), [
    '/api/health', '/api/ready', '/api/v1/auth/register', '/api/v1/auth/login',
    '/api/v1/auth/refresh', '/api/v1/auth/me', '/api/v1/auth/logout',
    '/api/v1/admin/users/{userId}/status',
    '/api/v1/households', '/api/v1/households/me', '/api/v1/households/me/profile',
    '/api/v1/households/me/submissions', '/api/v1/households/me/revisions',
    '/api/v1/admin/household-applications', '/api/v1/admin/household-applications/{revisionId}',
    '/api/v1/admin/household-applications/{revisionId}/review',
    '/api/v1/public/categories','/api/v1/public/places','/api/v1/public/places/{placeId}',
    '/api/v1/households/me/places','/api/v1/households/me/places/{placeId}',
    '/api/v1/households/me/places/{placeId}/profile','/api/v1/households/me/places/{placeId}/submissions',
    '/api/v1/households/me/places/{placeId}/revisions','/api/v1/households/me/places/{placeId}/status',
    '/api/v1/admin/categories','/api/v1/admin/categories/{categoryId}',
    '/api/v1/admin/place-submissions','/api/v1/admin/place-submissions/{revisionId}',
    '/api/v1/admin/place-submissions/{revisionId}/review',
    '/api/v1/households/me/services','/api/v1/households/me/services/{serviceId}',
    '/api/v1/households/me/services/{serviceId}/profile','/api/v1/households/me/services/{serviceId}/submissions',
    '/api/v1/households/me/services/{serviceId}/revisions','/api/v1/households/me/services/{serviceId}/status',
    '/api/v1/households/me/services/{serviceId}/offers','/api/v1/households/me/services/{serviceId}/offers/{offerId}',
    '/api/v1/households/me/services/{serviceId}/offers/{offerId}/pricing',
    '/api/v1/admin/service-submissions','/api/v1/admin/service-submissions/{revisionId}','/api/v1/admin/service-submissions/{revisionId}/review',
    '/api/v1/public/services','/api/v1/public/services/{serviceId}',
  ].sort());
  assert.deepEqual(document.paths['/api/v1/auth/me'].get.security, [{ BearerAuth: [] }]);
  assert.deepEqual(document.paths['/api/v1/admin/users/{userId}/status'].patch.security, [{ BearerAuth: [] }]);
  assert.deepEqual(document.paths['/api/v1/auth/register'].post.security, []);
  assert.deepEqual(document.paths['/api/v1/public/places'].get.security, []);
  assert.deepEqual(document.paths['/api/v1/public/categories'].get.security, []);
  assert.deepEqual(document.paths['/api/v1/admin/place-submissions/{revisionId}/review'].post.security,[{ BearerAuth:[] }]);
  assert.deepEqual(document.components.schemas.ErrorCode.enum, Object.keys(ERROR_DEFINITIONS));
  const response = await fetch(`${baseUrl}/api/openapi.json`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), openApiDocument);
});

test('real liveness and readiness responses satisfy their published schemas including request IDs', async () => {
  for (const path of ['/api/health', '/api/ready']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assertContract(document.paths[path].get.responses[200].content['application/json'].schema, body);
    assert.equal(body.meta.requestId, response.headers.get('x-request-id'));
  }
  unavailable = true;
  try {
    const response = await fetch(`${baseUrl}/api/ready`);
    assert.equal(response.status, 503);
    assertContract(document.paths['/api/ready'].get.responses[503].content['application/json'].schema, await response.json());
  } finally { unavailable = false; }
});

test('404, invalid JSON and schema errors satisfy the shared error response contract', async () => {
  const cases = [
    ['/missing', undefined, 404],
    ['/api/v1/contract-check', '{"count":', 400],
    ['/api/v1/contract-check', '{"count":0}', 422],
  ];
  for (const [path, body, status] of cases) {
    const response = await fetch(`${baseUrl}${path}`, body === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    assert.equal(response.status, status);
    assertContract(document.components.schemas.ErrorResponse, await response.json());
  }
});

test('Swagger UI serves its assets locally and disables the external validator', async () => {
  const response = await fetch(`${baseUrl}/api/docs/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(await response.text(), /swagger-ui\.css/);
  for (const path of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-init.js']) {
    const asset = await fetch(`${baseUrl}/api/docs/${path}`);
    assert.equal(asset.status, 200);
    const content = await asset.text();
    if (path === 'swagger-ui-init.js') {
      assert.match(content, /"validatorUrl": null/);
      assert.match(content, /"persistAuthorization": false/);
    }
  }
});

test('disabling API docs disables both Swagger UI and the OpenAPI document', async () => {
  const instance = createApp({ logger, docsEnabled: false }).listen(0);
  await new Promise((resolve) => instance.once('listening', resolve));
  const url = `http://127.0.0.1:${instance.address().port}`;
  try {
    for (const path of ['/api/docs/', '/api/docs/swagger-ui-bundle.js', '/api/openapi.json']) {
      const response = await fetch(`${url}${path}`);
      assert.equal(response.status, 404);
      assert.equal((await response.json()).error.code, 'NOT_FOUND');
    }
    assert.equal((await fetch(`${url}/api/health`)).status, 200);
  } finally {
    await new Promise((resolve, reject) => instance.close((error) => error ? reject(error) : resolve()));
  }
});
