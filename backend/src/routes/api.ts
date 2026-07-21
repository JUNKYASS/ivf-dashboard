import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import { GALTEX_MATERIALS } from '../constants';
import { runGeneration } from '../services/generateService';
import { OZON_OUTPUT_PATH, WB_OUTPUT_PATH } from '../types';

const upload = multer({ storage: multer.memoryStorage() });

const galtexFields = GALTEX_MATERIALS.map((m) => ({ name: m.key, maxCount: 1 }));
const otherFields = ['ad', 'tdl', 'logos', 'tt'].map((name) => ({ name, maxCount: 1 }));

const router = Router();

router.post(
  '/generate',
  upload.fields([...galtexFields, ...otherFields]),
  async (req, res, next) => {
    try {
      const files = (req.files as Record<string, Express.Multer.File[]> | undefined) ?? {};
      const result = await runGeneration(files);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get('/download/ozon', (_req, res) => {
  if (!fs.existsSync(OZON_OUTPUT_PATH)) {
    res.status(404).json({ error: 'Файл не найден' });
    return;
  }
  res.download(OZON_OUTPUT_PATH, 'ozon-stocks.xlsx');
});

router.get('/download/wb', (_req, res) => {
  if (!fs.existsSync(WB_OUTPUT_PATH)) {
    res.status(404).json({ error: 'Файл не найден' });
    return;
  }
  res.download(WB_OUTPUT_PATH, 'wb-stocks.xlsx');
});

export default router;
