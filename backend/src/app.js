import cors from 'cors';
import express from 'express';

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = express();

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'community-tourism-api',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use((_request, response) => {
  response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use((error, _request, response, _next) => {
  const status = error.status ?? 500;
  console.error(JSON.stringify({ level: 'error', message: error.message, status }));
  response.status(status).json({
    success: false,
    error: { code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message: status === 500 ? 'Internal server error' : error.message },
  });
});
