import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi.js';
import { AppError } from './shared/errors.js';
import { errorHandler, notFound, sendSuccess } from './shared/http.js';
import { logger as defaultLogger } from './shared/logger.js';
import { requestContext } from './shared/request-context.js';
import { createAuthRouter } from './auth/router.js';
import { createAdminAccountRouter } from './auth/admin-router.js';

export function createApp({
  checkDatabase,
  logger = defaultLogger,
  allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  docsEnabled = process.env.API_DOCS_ENABLED !== 'false',
  apiRouter,
  authService,
  trustProxy = 0,
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use(requestContext(logger));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError('CORS_ORIGIN_DENIED'));
    },
    exposedHeaders: ['X-Request-Id'],
  }));
  app.use(express.json({ limit: '1mb', type: ['application/json', 'application/*+json'] }));

  app.get('/api/health', (_request, response) => {
    response.set('Cache-Control', 'no-store');
    sendSuccess(response, {
      status: 'ok',
      service: 'community-tourism-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/ready', async (_request, response) => {
    response.set('Cache-Control', 'no-store');
    try {
      if (!checkDatabase) throw new Error('Database checker not configured');
      await checkDatabase();
    } catch (cause) {
      throw new AppError('DATABASE_UNAVAILABLE', { cause });
    }
    sendSuccess(response, { status: 'ready' });
  });

  if (docsEnabled) {
    app.get('/api/openapi.json', (_request, response) => response.json(openApiDocument));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Community Tourism API',
      swaggerOptions: { validatorUrl: null, persistAuthorization: false },
    }));
  }
  if (authService) {
    app.use('/api/v1/auth', createAuthRouter(authService));
    app.use('/api/v1/admin', createAdminAccountRouter(authService));
  }
  if (apiRouter) app.use('/api/v1', apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
