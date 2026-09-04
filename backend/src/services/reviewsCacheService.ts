import axios, { isAxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import { WB_FEEDBACKS_API_BASE_URL } from '../constants';
import { REVIEWS_CACHE_PATH, STORAGE_DIR } from '../types';
import { aggregateMpstatsComments, fetchMpstatsOzonComments } from './mpstatsService';
import { normalizeArticle } from './mappingLookupService';
import { resolveOzonSku } from './ozonSkuResolver';
import { lookupWbNmId } from './wbTitlesCacheService';

export type ReviewAggregate = {
  count: number;
  sumRating: number;
  avgRating: number;
};

export type ReviewsCacheFile = {
  wb: {
    updatedAt: string;
    byNmId: Record<string, ReviewAggregate>;
    byArticle: Record<string, ReviewAggregate>;
    reviewCount: number;
  };
  ozon: {
    updatedAt: string;
    bySku: Record<string, ReviewAggregate>;
    byOfferId: Record<string, ReviewAggregate>;
    reviewCount: number;
  };
};

export type ReviewsCacheStatus = {
  wb: {
    exists: boolean;
    updatedAt: string | null;
    reviewCount: number;
    productCount: number;
  };
  ozon: {
    exists: boolean;
    updatedAt: string | null;
    reviewCount: number;
    productCount: number;
    source: 'mpstats';
  };
};

export type ReviewRatingLookupResult = {
  marketplace: 'wb' | 'ozon';
  article: string;
  resolvedKey: string | null;
  count: number;
  avgRating: number | null;
  syncedAt: string | null;
  source: 'cache' | 'mpstats' | 'wb_api';
};

type WbFeedback = {
  productValuation?: number;
  productDetails?: {
    nmId?: number;
    supplierArticle?: string;
  };
};

type WbFeedbacksResponse = {
  data?: {
    feedbacks?: WbFeedback[];
  };
};

const WB_PAGE_SIZE = 1000;
const WB_MIN_REQUEST_INTERVAL_MS = 500;
const WB_MAX_PAGES = 500;
const WB_MAX_RETRIES = 8;

let wbLastRequestAt = 0;
let memoryCache: ReviewsCacheFile | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyCache(): ReviewsCacheFile {
  return {
    wb: {
      updatedAt: '',
      byNmId: {},
      byArticle: {},
      reviewCount: 0,
    },
    ozon: {
      updatedAt: '',
      bySku: {},
      byOfferId: {},
      reviewCount: 0,
    },
  };
}

function normalizeCache(raw: Partial<ReviewsCacheFile> | null | undefined): ReviewsCacheFile {
  const empty = emptyCache();
  return {
    wb: {
      updatedAt: raw?.wb?.updatedAt ?? empty.wb.updatedAt,
      byNmId: raw?.wb?.byNmId ?? empty.wb.byNmId,
      byArticle: raw?.wb?.byArticle ?? empty.wb.byArticle,
      reviewCount: raw?.wb?.reviewCount ?? empty.wb.reviewCount,
    },
    ozon: {
      updatedAt: raw?.ozon?.updatedAt ?? empty.ozon.updatedAt,
      bySku: raw?.ozon?.bySku ?? empty.ozon.bySku,
      byOfferId: raw?.ozon?.byOfferId ?? empty.ozon.byOfferId,
      reviewCount: raw?.ozon?.reviewCount ?? empty.ozon.reviewCount,
    },
  };
}

function readCacheFromDisk(): ReviewsCacheFile {
  if (!fs.existsSync(REVIEWS_CACHE_PATH)) {
    return emptyCache();
  }

  try {
    const raw = fs.readFileSync(REVIEWS_CACHE_PATH, 'utf-8');
    return normalizeCache(JSON.parse(raw) as Partial<ReviewsCacheFile>);
  } catch {
    return emptyCache();
  }
}

function writeCacheToDisk(cache: ReviewsCacheFile): void {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const tempPath = path.join(STORAGE_DIR, 'reviews-cache.tmp.json');
  fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2), 'utf-8');
  fs.renameSync(tempPath, REVIEWS_CACHE_PATH);
  memoryCache = cache;
}

export function getReviewsCache(): ReviewsCacheFile {
  if (!memoryCache) {
    memoryCache = readCacheFromDisk();
  }
  return memoryCache;
}

export function getReviewsCacheStatus(): ReviewsCacheStatus {
  const cache = getReviewsCache();

  return {
    wb: {
      exists: cache.wb.reviewCount > 0,
      updatedAt: cache.wb.updatedAt || null,
      reviewCount: cache.wb.reviewCount,
      productCount: Object.keys(cache.wb.byNmId).length,
    },
    ozon: {
      exists: cache.ozon.reviewCount > 0,
      updatedAt: cache.ozon.updatedAt || null,
      reviewCount: cache.ozon.reviewCount,
      productCount: Object.keys(cache.ozon.bySku).length,
      source: 'mpstats',
    },
  };
}

export function createEmptyAggregate(): ReviewAggregate {
  return { count: 0, sumRating: 0, avgRating: 0 };
}

export function addRatingToAggregate(
  aggregate: ReviewAggregate,
  rating: number,
): ReviewAggregate {
  const count = aggregate.count + 1;
  const sumRating = aggregate.sumRating + rating;
  return {
    count,
    sumRating,
    avgRating: roundRating(sumRating / count),
  };
}

export function roundRating(value: number): number {
  return Math.round(value * 100) / 100;
}

function upsertAggregate(
  map: Record<string, ReviewAggregate>,
  key: string,
  rating: number,
): void {
  const current = map[key] ?? createEmptyAggregate();
  map[key] = addRatingToAggregate(current, rating);
}

function saveOzonAggregate(
  sku: number,
  offerId: string | undefined,
  aggregate: ReviewAggregate,
): string {
  const cache = getReviewsCache();
  const syncedAt = new Date().toISOString();
  const skuKey = String(sku);

  cache.ozon.bySku[skuKey] = aggregate;
  if (offerId) {
    cache.ozon.byOfferId[normalizeArticle(offerId)] = aggregate;
  }

  cache.ozon.updatedAt = syncedAt;
  cache.ozon.reviewCount = Object.values(cache.ozon.bySku).reduce(
    (sum, item) => sum + item.count,
    0,
  );
  writeCacheToDisk(cache);
  return syncedAt;
}

async function waitForWbRateLimit(): Promise<void> {
  const elapsed = Date.now() - wbLastRequestAt;
  if (elapsed < WB_MIN_REQUEST_INTERVAL_MS) {
    await sleep(WB_MIN_REQUEST_INTERVAL_MS - elapsed);
  }
}

function getWbRetryDelayMs(error: unknown): number {
  if (!isAxiosError(error) || error.response?.status !== 429) {
    return 0;
  }

  const headers = error.response.headers;
  const retrySec = Number(headers['x-ratelimit-retry'] ?? headers['x-ratelimit-reset'] ?? 3);
  return Math.max(retrySec, 1) * 1000;
}

async function waitForWbRateLimitReset(headers: Record<string, unknown>): Promise<void> {
  const remaining = Number(headers['x-ratelimit-remaining']);
  if (!Number.isFinite(remaining) || remaining > 0) return;

  const resetSec = Number(headers['x-ratelimit-reset'] ?? 1);
  await sleep(Math.max(resetSec, 1) * 1000);
}

async function fetchWbFeedbacksPage(
  apiToken: string,
  skip: number,
  archive: boolean,
  nmId?: string,
): Promise<WbFeedback[]> {
  const endpoint = archive ? '/api/v1/feedbacks/archive' : '/api/v1/feedbacks';

  for (let attempt = 0; attempt < WB_MAX_RETRIES; attempt += 1) {
    await waitForWbRateLimit();
    wbLastRequestAt = Date.now();

    try {
      const response = await axios.get<WbFeedbacksResponse>(
        `${WB_FEEDBACKS_API_BASE_URL}${endpoint}`,
        {
          headers: { Authorization: apiToken },
          params: {
            take: WB_PAGE_SIZE,
            skip,
            order: 'dateDesc',
            ...(nmId ? { nmId: Number(nmId) } : {}),
          },
          timeout: 60_000,
        },
      );

      await waitForWbRateLimitReset(response.headers as Record<string, unknown>);
      return response.data.data?.feedbacks ?? [];
    } catch (error) {
      const retryDelayMs = getWbRetryDelayMs(error);
      if (retryDelayMs > 0 && attempt < WB_MAX_RETRIES - 1) {
        await sleep(retryDelayMs);
        continue;
      }
      throw error;
    }
  }

  throw new Error('WB Feedbacks API: превышен лимит запросов');
}

async function fetchWbFeedbacksForNmId(apiToken: string, nmId: string): Promise<WbFeedback[]> {
  const all: WbFeedback[] = [];

  for (const archive of [false, true]) {
    for (let page = 0; page < WB_MAX_PAGES; page += 1) {
      const skip = page * WB_PAGE_SIZE;
      const batch = await fetchWbFeedbacksPage(apiToken, skip, archive, nmId);
      if (batch.length === 0) break;
      all.push(...batch);
      if (batch.length < WB_PAGE_SIZE) break;
    }
  }

  return all;
}

async function fetchAllWbFeedbacks(apiToken: string): Promise<WbFeedback[]> {
  const all: WbFeedback[] = [];

  for (const archive of [false, true]) {
    for (let page = 0; page < WB_MAX_PAGES; page += 1) {
      const skip = page * WB_PAGE_SIZE;
      const batch = await fetchWbFeedbacksPage(apiToken, skip, archive);
      if (batch.length === 0) break;
      all.push(...batch);
      if (batch.length < WB_PAGE_SIZE) break;
    }
  }

  return all;
}

function buildWbAggregates(feedbacks: WbFeedback[]): ReviewsCacheFile['wb'] {
  const byNmId: Record<string, ReviewAggregate> = {};
  const byArticle: Record<string, ReviewAggregate> = {};
  let reviewCount = 0;

  for (const feedback of feedbacks) {
    const rating = feedback.productValuation;
    const nmId = feedback.productDetails?.nmId;
    if (rating === undefined || rating === null || nmId === undefined) continue;

    reviewCount += 1;
    const nmKey = String(nmId);
    upsertAggregate(byNmId, nmKey, rating);

    const supplierArticle = feedback.productDetails?.supplierArticle?.trim();
    if (supplierArticle) {
      upsertAggregate(byArticle, normalizeArticle(supplierArticle), rating);
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    byNmId,
    byArticle,
    reviewCount,
  };
}

function aggregateWbFeedbacks(feedbacks: WbFeedback[]): ReviewAggregate {
  let aggregate = createEmptyAggregate();

  for (const feedback of feedbacks) {
    const rating = feedback.productValuation;
    if (rating === undefined || rating === null) continue;
    aggregate = addRatingToAggregate(aggregate, rating);
  }

  return aggregate;
}

function saveWbAggregate(
  nmId: string,
  article: string,
  aggregate: ReviewAggregate,
): string {
  const cache = getReviewsCache();
  const syncedAt = new Date().toISOString();

  cache.wb.byNmId[nmId] = aggregate;
  cache.wb.byArticle[normalizeArticle(article)] = aggregate;
  cache.wb.updatedAt = syncedAt;
  cache.wb.reviewCount = Object.values(cache.wb.byNmId).reduce(
    (sum, item) => sum + item.count,
    0,
  );
  writeCacheToDisk(cache);
  return syncedAt;
}

function formatAxiosError(error: unknown, marketplace: 'WB'): string {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : `Ошибка синхронизации ${marketplace}`;
  }

  const status = error.response?.status;
  if (status === 403) {
    return (
      'WB: токен без доступа к «Отзывы и вопросы». ' +
      'Создайте токен с этой категорией в seller.wildberries.ru → Настройки → Доступ к API'
    );
  }

  if (status === 429) {
    const headers = error.response?.headers ?? {};
    const retrySec = Number(headers['x-ratelimit-retry'] ?? headers['x-ratelimit-reset'] ?? 0);
    const waitHint =
      retrySec > 0 ? ` Подождите ${retrySec} сек и повторите.` : ' Подождите минуту и повторите.';
    return `WB: превышен лимит запросов API.${waitHint}`;
  }

  const message =
    (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
  return `${marketplace}: ${message}`;
}

export async function syncWbReviewsCache(apiToken: string): Promise<ReviewsCacheStatus['wb']> {
  const feedbacks = await fetchAllWbFeedbacks(apiToken).catch((error) => {
    throw new Error(formatAxiosError(error, 'WB'));
  });

  const cache = getReviewsCache();
  cache.wb = buildWbAggregates(feedbacks);
  writeCacheToDisk(cache);

  return getReviewsCacheStatus().wb;
}

export async function fetchWbReviewRating(
  article: string,
  apiToken: string,
): Promise<ReviewRatingLookupResult> {
  const trimmed = article.trim();
  if (!trimmed) {
    return {
      marketplace: 'wb',
      article: trimmed,
      resolvedKey: null,
      count: 0,
      avgRating: null,
      syncedAt: null,
      source: 'wb_api',
    };
  }

  if (!apiToken) {
    throw new Error('Не настроен WB_API_TOKEN');
  }

  const nmId = lookupWbNmId(trimmed);
  if (!nmId) {
    throw new Error(
      'Артикул не найден в кэше товаров WB. Обновите кэш WB в Настройках → Настройки обработки заказов',
    );
  }

  const feedbacks = await fetchWbFeedbacksForNmId(apiToken, nmId).catch((error) => {
    throw new Error(formatAxiosError(error, 'WB'));
  });

  const aggregate = aggregateWbFeedbacks(feedbacks);
  const syncedAt = saveWbAggregate(nmId, trimmed, aggregate);

  return {
    marketplace: 'wb',
    article: trimmed,
    resolvedKey: `nmId:${nmId}`,
    count: aggregate.count,
    avgRating: aggregate.count ? aggregate.avgRating : null,
    syncedAt,
    source: 'wb_api',
  };
}

export function lookupWbReviewRating(article: string): ReviewRatingLookupResult {
  const trimmed = article.trim();
  const cache = getReviewsCache();

  if (!trimmed) {
    return {
      marketplace: 'wb',
      article: trimmed,
      resolvedKey: null,
      count: 0,
      avgRating: null,
      syncedAt: cache.wb.updatedAt || null,
      source: 'cache',
    };
  }

  const nmId = lookupWbNmId(trimmed);
  if (nmId) {
    const aggregate = cache.wb.byNmId[nmId];
    return {
      marketplace: 'wb',
      article: trimmed,
      resolvedKey: `nmId:${nmId}`,
      count: aggregate?.count ?? 0,
      avgRating: aggregate?.count ? aggregate.avgRating : null,
      syncedAt: cache.wb.updatedAt || null,
      source: 'cache',
    };
  }

  const articleAggregate = cache.wb.byArticle[normalizeArticle(trimmed)];
  if (articleAggregate?.count) {
    return {
      marketplace: 'wb',
      article: trimmed,
      resolvedKey: `article:${normalizeArticle(trimmed)}`,
      count: articleAggregate.count,
      avgRating: articleAggregate.avgRating,
      syncedAt: cache.wb.updatedAt || null,
      source: 'cache',
    };
  }

  return {
    marketplace: 'wb',
    article: trimmed,
    resolvedKey: nmId ? `nmId:${nmId}` : `article:${normalizeArticle(trimmed)}`,
    count: 0,
    avgRating: null,
    syncedAt: cache.wb.updatedAt || null,
    source: 'cache',
  };
}

export function aggregateWbFeedbacksForTest(feedbacks: WbFeedback[]): ReviewAggregate {
  return aggregateWbFeedbacks(feedbacks);
}

export function formatWbAxiosErrorForTest(error: unknown): string {
  return formatAxiosError(error, 'WB');
}

export function getWbRetryDelayMsForTest(error: unknown): number {
  return getWbRetryDelayMs(error);
}

export async function fetchOzonReviewRating(
  article: string,
  mpstatsToken: string,
  ozonClientId: string,
  ozonApiKey: string,
): Promise<ReviewRatingLookupResult> {
  const trimmed = article.trim();
  if (!trimmed) {
    return {
      marketplace: 'ozon',
      article: trimmed,
      resolvedKey: null,
      count: 0,
      avgRating: null,
      syncedAt: null,
      source: 'mpstats',
    };
  }

  if (!mpstatsToken) {
    throw new Error('Не настроен MPSTATS_TOKEN');
  }

  const resolved = await resolveOzonSku(trimmed, ozonClientId, ozonApiKey);
  if (!resolved) {
    throw new Error('Не удалось определить SKU Ozon для артикула');
  }

  const comments = await fetchMpstatsOzonComments(resolved.sku, mpstatsToken);
  const aggregate = aggregateMpstatsComments(comments);
  const syncedAt = saveOzonAggregate(
    resolved.sku,
    resolved.offerId,
    {
      count: aggregate.count,
      sumRating: aggregate.sumRating,
      avgRating: aggregate.avgRating,
    },
  );

  return {
    marketplace: 'ozon',
    article: trimmed,
    resolvedKey: resolved.resolvedKey,
    count: aggregate.count,
    avgRating: aggregate.count ? aggregate.avgRating : null,
    syncedAt,
    source: 'mpstats',
  };
}
