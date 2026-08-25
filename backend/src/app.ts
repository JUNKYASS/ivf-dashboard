import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createAuthMiddleware, errorHandler } from './middleware/auth';
import apiRouter from './routes/api';
import configRouter from './routes/config';
import marketplaceRouter from './routes/marketplace';
import { initStorage } from './services/configService';

export function createApp() {
  initStorage();

  const app = express();
  app.use(
    cors({
      exposedHeaders: ['X-Stickers-Count', 'X-Stickers-Skipped', 'Content-Disposition'],
    }),
  );
  app.use(express.json());
  // app.use(createAuthMiddleware());

  app.use('/api', configRouter);
  app.use('/api', apiRouter);
  app.use('/api', marketplaceRouter);

  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
