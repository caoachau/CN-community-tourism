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
import { createHouseholdRouter, createHouseholdAdminRouter } from './households/router.js';
import { createPublicCatalogRouter, createOwnedPlaceRouter, createCategoryAdminRouter, createPlaceReviewRouter } from './catalog/router.js';
import { createOwnedServiceRouter,createServiceReviewRouter,createPublicServiceRouter } from './services/router.js';
import { createOwnedRoomRouter,createRoomReviewRouter,createPublicRoomRouter } from './rooms/router.js';

export function createApp({
  checkDatabase,
  logger = defaultLogger,
  allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  docsEnabled = process.env.API_DOCS_ENABLED !== 'false',
  apiRouter,
  authService,
  householdService,
  catalogService,
  serviceService,
  roomService,
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
  if (householdService && authService) {
    app.use('/api/v1/households', createHouseholdRouter(householdService, authService));
    app.use('/api/v1/admin/household-applications', createHouseholdAdminRouter(householdService, authService));
  }
  if (catalogService) {
    app.use('/api/v1/public',createPublicCatalogRouter(catalogService));
    if (authService) {
      app.use('/api/v1/households/me/places',createOwnedPlaceRouter(catalogService,authService));
      app.use('/api/v1/admin/categories',createCategoryAdminRouter(catalogService,authService));
      app.use('/api/v1/admin/place-submissions',createPlaceReviewRouter(catalogService,authService));
    }
  }
  if(serviceService){
    app.use('/api/v1/public/services',createPublicServiceRouter(serviceService));
    if(authService){
      app.use('/api/v1/households/me/services',createOwnedServiceRouter(serviceService,authService));
      app.use('/api/v1/admin/service-submissions',createServiceReviewRouter(serviceService,authService));
    }
  }
  if (roomService) {
    app.use('/api/v1/public/rooms',createPublicRoomRouter(roomService));
    if (authService) {
      app.use('/api/v1/households/me/rooms',createOwnedRoomRouter(roomService,authService));
      app.use('/api/v1/admin/room-submissions',createRoomReviewRouter(roomService,authService));
    }
  }
  if (apiRouter) app.use('/api/v1', apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
