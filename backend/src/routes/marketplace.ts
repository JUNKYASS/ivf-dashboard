import { Router } from 'express';
import multer from 'multer';
import {
  getMarketplaceApiCredentials,
  getMarketplaceApiPublicConfig,
  updateMarketplaceApiConfig,
} from '../services/marketplaceEnvService';
import { fetchAndProcessOrders } from '../services/ordersService';
import {
  getOzonProductCacheStatus,
  syncOzonProductCache,
} from '../services/ozonProductCacheService';
import {
  fetchOzonReviewRating,
  fetchWbReviewRating,
  getReviewsCacheStatus,
  syncWbReviewsCache,
} from '../services/reviewsCacheService';
import { getWbTitlesCacheStatus, syncWbTitlesCache } from '../services/wbTitlesCacheService';
import { generateStickers, StickersError } from '../services/stickersService';
import { parseStickersScope } from '../services/stickersShared';
import {
  getWarehouseStockStatus,
  saveWarehouseStock,
} from '../services/warehouseStockService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/config/marketplace-api', (_req, res) => {
  res.json({
    ...getMarketplaceApiPublicConfig(),
    wbTitlesCache: getWbTitlesCacheStatus(),
    ozonProductCache: getOzonProductCacheStatus(),
    reviewsCache: getReviewsCacheStatus(),
  });
});

router.post('/config/marketplace-api', (req, res) => {
  const { ozonClientId, ozonApiKey, wbApiToken, mpstatsToken } = req.body as {
    ozonClientId?: string;
    ozonApiKey?: string;
    wbApiToken?: string;
    mpstatsToken?: string;
  };

  const config = updateMarketplaceApiConfig({ ozonClientId, ozonApiKey, wbApiToken, mpstatsToken });
  res.json({
    ...config,
    wbTitlesCache: getWbTitlesCacheStatus(),
    ozonProductCache: getOzonProductCacheStatus(),
    reviewsCache: getReviewsCacheStatus(),
  });
});

router.post('/marketplace/wb-titles/sync', async (_req, res, next) => {
  try {
    const credentials = getMarketplaceApiCredentials();
    if (!credentials.wbApiToken) {
      res.status(400).json({ error: 'Не настроен WB_API_TOKEN' });
      return;
    }

    const status = await syncWbTitlesCache(credentials.wbApiToken);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

router.post('/marketplace/ozon-products/sync', async (_req, res, next) => {
  try {
    const credentials = getMarketplaceApiCredentials();
    if (!credentials.ozonClientId || !credentials.ozonApiKey) {
      res.status(400).json({ error: 'Не настроены OZON_CLIENT_ID / OZON_API_KEY' });
      return;
    }

    const status = await syncOzonProductCache(credentials.ozonClientId, credentials.ozonApiKey);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

router.get('/marketplace/reviews/status', (_req, res) => {
  res.json(getReviewsCacheStatus());
});

router.post('/marketplace/reviews/wb/sync', async (_req, res, next) => {
  try {
    const credentials = getMarketplaceApiCredentials();
    if (!credentials.wbApiToken) {
      res.status(400).json({ error: 'Не настроен WB_API_TOKEN' });
      return;
    }

    const status = await syncWbReviewsCache(credentials.wbApiToken);
    res.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка синхронизации отзывов WB';
    res.status(400).json({ error: message });
  }
});

router.get('/marketplace/reviews/rating', async (req, res) => {
  const marketplace = req.query.marketplace;
  const article = typeof req.query.article === 'string' ? req.query.article : '';

  if (marketplace === 'wb') {
    try {
      const credentials = getMarketplaceApiCredentials();
      const result = await fetchWbReviewRating(article, credentials.wbApiToken);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка проверки отзывов WB';
      res.status(400).json({ error: message });
    }
    return;
  }

  if (marketplace === 'ozon') {
    try {
      const credentials = getMarketplaceApiCredentials();
      const result = await fetchOzonReviewRating(
        article,
        credentials.mpstatsToken,
        credentials.ozonClientId,
        credentials.ozonApiKey,
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка проверки отзывов Ozon';
      res.status(400).json({ error: message });
    }
    return;
  }

  res.status(400).json({ error: 'Укажите marketplace=wb или marketplace=ozon' });
});

router.get('/marketplace/warehouse-stock', (_req, res) => {
  res.json(getWarehouseStockStatus());
});

router.post('/marketplace/warehouse-stock', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Файл не передан' });
    return;
  }

  try {
    const result = saveWarehouseStock(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка обработки файла остатков';
    res.status(400).json({ error: message });
  }
});

router.post('/marketplace/orders/fetch', async (_req, res, next) => {
  try {
    const result = await fetchAndProcessOrders();
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Mapping-файл не загружен')) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

router.post('/marketplace/stickers/:marketplace', async (req, res, next) => {
  const marketplace = req.params.marketplace;
  if (marketplace !== 'ozon' && marketplace !== 'wb') {
    res.status(400).json({ error: 'Неизвестный маркетплейс' });
    return;
  }

  try {
    const scope = parseStickersScope(req.query.scope);
    const result = await generateStickers(marketplace, { scope });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${marketplace}-labels.pdf"`);
    res.setHeader('X-Stickers-Count', String(result.count));
    res.setHeader('X-Stickers-Skipped', result.skipped.join(','));
    res.send(Buffer.from(result.pdfBytes));
  } catch (error) {
    if (error instanceof StickersError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    next(error);
  }
});

export default router;
