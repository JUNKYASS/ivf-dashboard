import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import {
  getPublicConfig,
  readConfig,
  updateMappingMeta,
  updateTexdesignUrl,
  updateTexdesignEnabled,
  updateThreshold,
} from '../services/configService';
import { MAPPING_PATH } from '../types';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/config', (_req, res) => {
  const config = readConfig();
  res.json(getPublicConfig(config));
});

router.post('/config/mapping', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Файл не передан' });
    return;
  }

  fs.mkdirSync(path.dirname(MAPPING_PATH), { recursive: true });
  fs.writeFileSync(MAPPING_PATH, req.file.buffer);
  const config = updateMappingMeta(req.file.originalname);
  res.json(getPublicConfig(config));
});

router.post('/config/texdesign-url', (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL обязателен' });
    return;
  }
  const config = updateTexdesignUrl(url.trim());
  res.json(getPublicConfig(config));
});

router.post('/config/texdesign-enabled', (req, res) => {
  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'enabled обязателен' });
    return;
  }
  const config = updateTexdesignEnabled(enabled);
  res.json(getPublicConfig(config));
});

router.post('/config/thresholds', (req, res) => {
  const { key, threshold, remain } = req.body as {
    key?: string;
    threshold?: number;
    remain?: number;
  };

  if (!key || threshold === undefined || remain === undefined) {
    res.status(400).json({ error: 'key, threshold и remain обязательны' });
    return;
  }

  if (Number.isNaN(Number(threshold)) || Number.isNaN(Number(remain))) {
    res.status(400).json({ error: 'threshold и remain должны быть числами' });
    return;
  }

  const config = updateThreshold(key, { threshold: Number(threshold), remain: Number(remain) });
  res.json(getPublicConfig(config));
});

export default router;
