import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { YM_API_BASE_URL } from '../constants';
import { STORAGE_DIR, YM_PRODUCT_CACHE_PATH } from '../types';
import { fetchYmBusinessId, ymHeaders } from './ymApiUtils';
import { normalizeArticle } from './mappingLookupService';

type YmOfferMapping = {
  offer?: {
    offerId?: string;
    pictures?: string[];
  };
};

type YmOfferMappingsResponse = {
  result?: {
    offerMappings?: YmOfferMapping[];
    paging?: { nextPageToken?: string };
  };
};

export type YmProductCacheFile = {
  updatedAt: string;
  imageByOfferId: Record<string, string>;
};

export type YmProductCacheStatus = {
  exists: boolean;
  updatedAt: string | null;
  count: number;
};

const PAGE_LIMIT = 100;
const MIN_REQUEST_INTERVAL_MS = 650;
const MAX_PAGES = 500;

let lastRequestAt = 0;
let memoryCache: YmProductCacheFile | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyCache(): YmProductCacheFile {
  return {
    updatedAt: '',
    imageByOfferId: {},
  };
}

function normalizeCache(raw: Partial<YmProductCacheFile> | null | undefined): YmProductCacheFile {
  return {
    updatedAt: raw?.updatedAt ?? '',
    imageByOfferId: raw?.imageByOfferId ?? {},
  };
}

export function pickYmImageUrl(pictures: string[] | null | undefined): string | null {
  const first = pictures?.find((url) => typeof url === 'string' && url.trim());
  return first?.trim() || null;
}

function readCacheFromDisk(): YmProductCacheFile {
  if (!fs.existsSync(YM_PRODUCT_CACHE_PATH)) {
    return emptyCache();
  }

  try {
    const raw = fs.readFileSync(YM_PRODUCT_CACHE_PATH, 'utf-8');
    return normalizeCache(JSON.parse(raw) as Partial<YmProductCacheFile>);
  } catch {
    return emptyCache();
  }
}

function writeCacheToDisk(cache: YmProductCacheFile): void {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const tempPath = path.join(STORAGE_DIR, 'ym-product-cache.tmp.json');
  fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2), 'utf-8');
  fs.renameSync(tempPath, YM_PRODUCT_CACHE_PATH);
  memoryCache = cache;
}

export function getYmProductCache(): YmProductCacheFile {
  if (!memoryCache) {
    memoryCache = readCacheFromDisk();
  }
  return memoryCache;
}

export function getYmProductCacheStatus(): YmProductCacheStatus {
  const cache = getYmProductCache();
  const count = Object.keys(cache.imageByOfferId).length;

  return {
    exists: count > 0,
    updatedAt: cache.updatedAt || null,
    count,
  };
}

export function lookupYmProductImage(offerId: string): string | null {
  const cache = getYmProductCache();
  return cache.imageByOfferId[normalizeArticle(offerId)] ?? null;
}

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
}

async function fetchOfferMappingsPage(
  apiToken: string,
  businessId: number,
  pageToken?: string,
): Promise<YmOfferMappingsResponse['result']> {
  await waitForRateLimit();
  lastRequestAt = Date.now();

  const response = await axios.post<YmOfferMappingsResponse>(
    `${YM_API_BASE_URL}/v2/businesses/${businessId}/offer-mappings`,
    {},
    {
      headers: ymHeaders(apiToken),
      params: {
        limit: PAGE_LIMIT,
        ...(pageToken ? { pageToken } : {}),
      },
      timeout: 60_000,
    },
  );

  return response.data?.result ?? {};
}

export async function syncYmProductCache(apiToken: string): Promise<YmProductCacheStatus> {
  const businessId = await fetchYmBusinessId(apiToken);
  const cache = emptyCache();
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchOfferMappingsPage(apiToken, businessId, pageToken);
    const mappings = result?.offerMappings ?? [];

    for (const mapping of mappings) {
      const offerId = mapping.offer?.offerId?.trim();
      if (!offerId) continue;

      const imageUrl = pickYmImageUrl(mapping.offer?.pictures);
      if (imageUrl) {
        cache.imageByOfferId[normalizeArticle(offerId)] = imageUrl;
      }
    }

    pageToken = result?.paging?.nextPageToken;
    if (!pageToken || mappings.length === 0) break;
  }

  cache.updatedAt = new Date().toISOString();
  writeCacheToDisk(cache);

  return getYmProductCacheStatus();
}
