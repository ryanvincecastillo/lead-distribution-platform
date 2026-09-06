import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

export function createApp() {
  const app = express();

  // Behind Nginx/PM2 on the VPS the real visitor IP arrives in X-Forwarded-For.
  // Without this, req.ip would be the proxy address and every lead would share one IP.
  app.set('trust proxy', true);

  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  return app;
}
