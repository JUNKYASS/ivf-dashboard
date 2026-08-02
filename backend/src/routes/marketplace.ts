import { Router } from 'express';
import {
  getMarketplaceApiCredentials,
  getMarketplaceApiPublicConfig,
  updateMarketplaceApiConfig,
} from '../services/marketplaceEnvService';
import { fetchAndProcessOrders } from '../services/ordersService';
import { getWbTitlesCacheStatus, syncWbTitlesCache } from '../services/wbTitlesCacheService';

const router = Router();

router.get('/config/marketplace-api', (_req, res) => {
  res.json({
    ...getMarketplaceApiPublicConfig(),
    wbTitlesCache: getWbTitlesCacheStatus(),
  });
});

router.post('/config/marketplace-api', (req, res) => {
  const { ozonClientId, ozonApiKey, wbApiToken } = req.body as {
    ozonClientId?: string;
    ozonApiKey?: string;
    wbApiToken?: string;
  };

  const config = updateMarketplaceApiConfig({ ozonClientId, ozonApiKey, wbApiToken });
  res.json({
    ...config,
    wbTitlesCache: getWbTitlesCacheStatus(),
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

export default router;
