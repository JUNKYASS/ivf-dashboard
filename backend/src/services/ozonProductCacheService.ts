import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { OZON_API_BASE_URL } from '../constants';
import { OZON_PRODUCT_CACHE_PATH, STORAGE_DIR } from '../types';
import { normalizeArticle } from './mappingLookupService';
import { pickOzonSkuFromInfo } from './ozonSkuResolver';

type OzonListItem = {
  product_id?: number;
  offer_id?: string;
};

type OzonProductListResponse = {
  result?: {
    items?: OzonListItem[];
    total?: number;
    last_id?: string;
  };
};

type OzonProductInfo = {
  offer_id?: string;
  name?: string;
  sku?: number;
  sources?: Array<{ sku?: number }>;
  primary_image?: string | string[];
  images?: string[];
  model_info?: {
    model_id?: number;
    count?: number;
  };
};

type OzonProductInfoListResponse = {
  items?: OzonProductInfo[];
  result?: {
    items?: OzonProductInfo[];
  };
};

export type OzonProductCacheFile = {
  updatedAt: string;
  imageByOfferId: Record<string, string>;
  modelIdByOfferId: Record<string, number>;
  offerIdsByModelId: Record<string, string[]>;
  skuByOfferId: Record<string, number>;
};

export type OzonProductCacheStatus = {
  exists: boolean;
  updatedAt: string | null;
  count: number;
};

const LIST_LIMIT = 1000;
const INFO_BATCH_SIZE = 100;
const MIN_REQUEST_INTERVAL_MS = 400;
const MAX_LIST_PAGES = 200;

let lastRequestAt = 0;
let memoryCache: OzonProductCacheFile | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyCache(): OzonProductCacheFile {
  return {
    updatedAt: '',
    imageByOfferId: {},
    modelIdByOfferId: {},
    offerIdsByModelId: {},
    skuByOfferId: {},
  };
}

function normalizeCache(raw: Partial<OzonProductCacheFile> | null | undefined): OzonProductCacheFile {
  return {
    updatedAt: raw?.updatedAt ?? '',
    imageByOfferId: raw?.imageByOfferId ?? {},
    modelIdByOfferId: raw?.modelIdByOfferId ?? {},
    offerIdsByModelId: raw?.offerIdsByModelId ?? {},
    skuByOfferId: raw?.skuByOfferId ?? {},
  };
}

function readCacheFromDisk(): OzonProductCacheFile {
  if (!fs.existsSync(OZON_PRODUCT_CACHE_PATH)) {
    return emptyCache();
  }

  try {
    const raw = fs.readFileSync(OZON_PRODUCT_CACHE_PATH, 'utf-8');
    return normalizeCache(JSON.parse(raw) as Partial<OzonProductCacheFile>);
  } catch {
    return emptyCache();
  }
}

function writeCacheToDisk(cache: OzonProductCacheFile): void {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const tempPath = path.join(STORAGE_DIR, 'ozon-product-cache.tmp.json');
  fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2), 'utf-8');
  fs.renameSync(tempPath, OZON_PRODUCT_CACHE_PATH);
  memoryCache = cache;
}

export function getOzonProductCache(): OzonProductCacheFile {
  if (!memoryCache) {
    memoryCache = readCacheFromDisk();
  }
  return memoryCache;
}

export function getOzonProductCacheStatus(): OzonProductCacheStatus {
  const cache = getOzonProductCache();
  const count = Object.keys(cache.imageByOfferId).length;

  return {
    exists: count > 0,
    updatedAt: cache.updatedAt || null,
    count,
  };
}

export function lookupOzonProductImage(offerId: string): string | null {
  const cache = getOzonProductCache();
  return cache.imageByOfferId[normalizeArticle(offerId)] ?? null;
}

function pickOzonImageUrl(item: OzonProductInfo): string | null {
  const primary = item.primary_image;
  if (typeof primary === 'string' && primary.trim()) {
    return primary.trim();
  }
  if (Array.isArray(primary)) {
    const first = primary.find((url) => typeof url === 'string' && url.trim());
    if (first) return first.trim();
  }

  const fromImages = item.images?.find((url) => typeof url === 'string' && url.trim());
  return fromImages?.trim() || null;
}

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
}

function ozonHeaders(clientId: string, apiKey: string) {
  return {
    'Client-Id': clientId,
    'Api-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

async function fetchProductListPage(
  clientId: string,
  apiKey: string,
  lastId: string,
): Promise<OzonProductListResponse> {
  await waitForRateLimit();
  lastRequestAt = Date.now();

  const response = await axios.post<OzonProductListResponse>(
    `${OZON_API_BASE_URL}/v3/product/list`,
    {
      filter: { visibility: 'ALL' },
      last_id: lastId,
      limit: LIST_LIMIT,
    },
    {
      headers: ozonHeaders(clientId, apiKey),
      timeout: 60_000,
    },
  );

  return response.data;
}

async function fetchProductInfoBatch(
  clientId: string,
  apiKey: string,
  offerIds: string[],
): Promise<OzonProductInfo[]> {
  await waitForRateLimit();
  lastRequestAt = Date.now();

  const response = await axios.post<OzonProductInfoListResponse>(
    `${OZON_API_BASE_URL}/v3/product/info/list`,
    {
      offer_id: offerIds,
      product_id: [],
      sku: [],
    },
    {
      headers: ozonHeaders(clientId, apiKey),
      timeout: 60_000,
    },
  );

  return response.data.items ?? response.data.result?.items ?? [];
}

export async function syncOzonProductCache(
  clientId: string,
  apiKey: string,
): Promise<OzonProductCacheStatus> {
  const offerIds: string[] = [];
  let lastId = '';

  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const data = await fetchProductListPage(clientId, apiKey, lastId);
    const items = data.result?.items ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      const offerId = item.offer_id?.trim();
      if (offerId) {
        offerIds.push(offerId);
      }
    }

    const nextLastId = data.result?.last_id ?? '';
    if (!nextLastId || nextLastId === lastId || items.length < LIST_LIMIT) {
      break;
    }
    lastId = nextLastId;
  }

  const cache = emptyCache();
  const uniqueOfferIds = [...new Set(offerIds.map((id) => id.trim()).filter(Boolean))];

  for (let i = 0; i < uniqueOfferIds.length; i += INFO_BATCH_SIZE) {
    const batch = uniqueOfferIds.slice(i, i + INFO_BATCH_SIZE);
    const infos = await fetchProductInfoBatch(clientId, apiKey, batch);

    for (const info of infos) {
      const offerId = info.offer_id?.trim();
      if (!offerId) continue;

      const offerKey = normalizeArticle(offerId);
      const imageUrl = pickOzonImageUrl(info);
      if (imageUrl) {
        cache.imageByOfferId[offerKey] = imageUrl;
      }

      const sku = pickOzonSkuFromInfo(info);
      if (sku) {
        cache.skuByOfferId[offerKey] = sku;
      }

      const modelId = info.model_info?.model_id;
      if (modelId) {
        cache.modelIdByOfferId[offerKey] = modelId;
        const modelKey = String(modelId);
        const existing = cache.offerIdsByModelId[modelKey] ?? [];
        if (!existing.includes(offerId)) {
          cache.offerIdsByModelId[modelKey] = [...existing, offerId];
        }
      }
    }
  }

  cache.updatedAt = new Date().toISOString();
  writeCacheToDisk(cache);

  return getOzonProductCacheStatus();
}
