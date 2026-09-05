import fs from 'fs';
import path from 'path';
import { REVIEWS_CACHE_PATH, STORAGE_DIR } from '../types';
import {
  aggregateMpstatsComments,
  fetchMpstatsOzonComments,
  fetchMpstatsWbComments,
} from './mpstatsService';
import { normalizeArticle } from './mappingLookupService';
import { listOzonModelGroupMembers } from './ozonModelGroupService';
import { resolveOzonSku } from './ozonSkuResolver';
import { listWbGroupMembers, lookupWbNmId } from './wbTitlesCacheService';

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
    source: 'mpstats';
  };
  ozon: {
    exists: boolean;
    updatedAt: string | null;
    reviewCount: number;
    productCount: number;
    source: 'mpstats';
  };
};

export type ReviewGroupMemberRating = {
  article: string;
  resolvedKey: string;
  count: number;
  avgRating: number | null;
  isRequested: boolean;
};

export type ReviewRatingLookupResult = {
  marketplace: 'wb' | 'ozon';
  article: string;
  resolvedKey: string | null;
  count: number;
  avgRating: number | null;
  syncedAt: string | null;
  source: 'cache' | 'mpstats';
  groupMembers?: ReviewGroupMemberRating[];
  groupError?: string;
  stale?: boolean;
};

let memoryCache: ReviewsCacheFile | null = null;

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
      source: 'mpstats',
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

function aggregateToMemberRating(
  resolvedKey: string,
  aggregate: ReviewAggregate | undefined,
): Pick<ReviewGroupMemberRating, 'count' | 'avgRating' | 'resolvedKey'> | null {
  if (!aggregate) return null;

  return {
    resolvedKey,
    count: aggregate.count,
    avgRating: aggregate.count ? aggregate.avgRating : null,
  };
}

function lookupCachedWbMemberRating(
  nmId: string,
  article: string,
): Pick<ReviewGroupMemberRating, 'count' | 'avgRating' | 'resolvedKey'> | null {
  const cache = getReviewsCache();
  return (
    aggregateToMemberRating(`nmId:${nmId}`, cache.wb.byNmId[nmId]) ??
    aggregateToMemberRating(`article:${normalizeArticle(article)}`, cache.wb.byArticle[normalizeArticle(article)])
  );
}

function lookupCachedOzonMemberRating(
  sku: number,
  offerId: string,
): Pick<ReviewGroupMemberRating, 'count' | 'avgRating' | 'resolvedKey'> | null {
  const cache = getReviewsCache();
  return (
    aggregateToMemberRating(`sku:${sku}`, cache.ozon.bySku[String(sku)]) ??
    aggregateToMemberRating(
      `offer:${normalizeArticle(offerId)}`,
      cache.ozon.byOfferId[normalizeArticle(offerId)],
    )
  );
}

const wbRatingInflight = new Map<
  string,
  Promise<Pick<ReviewGroupMemberRating, 'count' | 'avgRating' | 'resolvedKey'>>
>();
const ozonRatingInflight = new Map<
  string,
  Promise<Pick<ReviewGroupMemberRating, 'count' | 'avgRating' | 'resolvedKey'>>
>();

export function sortGroupMembersByRating(members: ReviewGroupMemberRating[]): ReviewGroupMemberRating[] {
  return [...members].sort((left, right) => {
    const leftScore = left.count > 0 && left.avgRating !== null ? left.avgRating : Number.POSITIVE_INFINITY;
    const rightScore =
      right.count > 0 && right.avgRating !== null ? right.avgRating : Number.POSITIVE_INFINITY;

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return left.article.localeCompare(right.article, 'ru');
  });
}

async function fetchMpstatsRatingForWbNmId(
  nmId: string,
  article: string,
  mpstatsToken: string,
): Promise<Pick<ReviewGroupMemberRating, 'count' | 'avgRating' | 'resolvedKey'>> {
  const cached = lookupCachedWbMemberRating(nmId, article);
  if (cached) return cached;

  const inflight = wbRatingInflight.get(nmId);
  if (inflight) return inflight;

  const request = (async () => {
    const comments = await fetchMpstatsWbComments(Number(nmId), mpstatsToken);
    const aggregate = aggregateMpstatsComments(comments);
    saveWbAggregate(nmId, article, {
      count: aggregate.count,
      sumRating: aggregate.sumRating,
      avgRating: aggregate.avgRating,
    });
    return {
      resolvedKey: `nmId:${nmId}`,
      count: aggregate.count,
      avgRating: aggregate.count ? aggregate.avgRating : null,
    };
  })();

  wbRatingInflight.set(nmId, request);
  try {
    return await request;
  } finally {
    wbRatingInflight.delete(nmId);
  }
}

async function fetchMpstatsRatingForOzonSku(
  sku: number,
  offerId: string,
  mpstatsToken: string,
): Promise<Pick<ReviewGroupMemberRating, 'count' | 'avgRating' | 'resolvedKey'>> {
  const cached = lookupCachedOzonMemberRating(sku, offerId);
  if (cached) return cached;

  const skuKey = String(sku);
  const inflight = ozonRatingInflight.get(skuKey);
  if (inflight) return inflight;

  const request = (async () => {
    const comments = await fetchMpstatsOzonComments(sku, mpstatsToken);
    const aggregate = aggregateMpstatsComments(comments);
    saveOzonAggregate(sku, offerId, {
      count: aggregate.count,
      sumRating: aggregate.sumRating,
      avgRating: aggregate.avgRating,
    });
    return {
      resolvedKey: `sku:${sku}`,
      count: aggregate.count,
      avgRating: aggregate.count ? aggregate.avgRating : null,
    };
  })();

  ozonRatingInflight.set(skuKey, request);
  try {
    return await request;
  } finally {
    ozonRatingInflight.delete(skuKey);
  }
}

async function buildWbGroupRatings(
  requestedArticle: string,
  nmId: string,
  mpstatsToken: string,
  mainRating?: Pick<ReviewGroupMemberRating, 'count' | 'avgRating' | 'resolvedKey'>,
): Promise<ReviewGroupMemberRating[]> {
  const members = listWbGroupMembers(nmId);
  if (members.length <= 1) return [];

  const requestedKey = normalizeArticle(requestedArticle);
  const ratings = await Promise.all(
    members.map(async (member) => {
      if (member.nmId === nmId && mainRating) {
        return {
          article: member.article,
          resolvedKey: mainRating.resolvedKey,
          count: mainRating.count,
          avgRating: mainRating.avgRating,
          isRequested: true,
        };
      }

      const rating = await fetchMpstatsRatingForWbNmId(member.nmId, member.article, mpstatsToken);
      return {
        article: member.article,
        resolvedKey: rating.resolvedKey,
        count: rating.count,
        avgRating: rating.avgRating,
        isRequested: normalizeArticle(member.article) === requestedKey || member.nmId === nmId,
      };
    }),
  );

  return sortGroupMembersByRating(ratings);
}

async function buildOzonGroupRatings(
  requestedArticle: string,
  clientId: string,
  apiKey: string,
  mpstatsToken: string,
  mainRating?: Pick<ReviewGroupMemberRating, 'count' | 'avgRating' | 'resolvedKey'>,
  requestedSku?: number,
): Promise<ReviewGroupMemberRating[]> {
  const members = await listOzonModelGroupMembers(requestedArticle, clientId, apiKey);
  if (members.length <= 1) return [];

  const requestedKey = normalizeArticle(requestedArticle);
  const ratings = await Promise.all(
    members.map(async (member) => {
      if (requestedSku !== undefined && member.sku === requestedSku && mainRating) {
        return {
          article: member.offerId,
          resolvedKey: mainRating.resolvedKey,
          count: mainRating.count,
          avgRating: mainRating.avgRating,
          isRequested: true,
        };
      }

      const rating = await fetchMpstatsRatingForOzonSku(member.sku, member.offerId, mpstatsToken);
      return {
        article: member.offerId,
        resolvedKey: rating.resolvedKey,
        count: rating.count,
        avgRating: rating.avgRating,
        isRequested: normalizeArticle(member.offerId) === requestedKey,
      };
    }),
  );

  return sortGroupMembersByRating(ratings);
}

export async function fetchWbReviewRating(
  article: string,
  mpstatsToken: string,
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
      source: 'mpstats',
    };
  }

  if (!mpstatsToken) {
    throw new Error('Не настроен MPSTATS_TOKEN');
  }

  const nmId = lookupWbNmId(trimmed);
  if (!nmId) {
    throw new Error(
      'Артикул не найден в кэше товаров WB. Обновите кэш WB в Настройках → Настройки обработки заказов',
    );
  }

  let comments;
  try {
    comments = await fetchMpstatsWbComments(Number(nmId), mpstatsToken);
  } catch (error) {
    const cached = lookupWbReviewRating(trimmed);
    if (cached.resolvedKey && (cached.count > 0 || cached.syncedAt)) {
      return {
        ...cached,
        source: 'cache',
        stale: true,
        groupError: error instanceof Error ? error.message : 'MPSTATS недоступен',
      };
    }
    throw error;
  }

  const aggregate = aggregateMpstatsComments(comments);
  const syncedAt = saveWbAggregate(nmId, trimmed, {
    count: aggregate.count,
    sumRating: aggregate.sumRating,
    avgRating: aggregate.avgRating,
  });

  let groupMembers: ReviewGroupMemberRating[] | undefined;
  let groupError: string | undefined;
  try {
    const members = await buildWbGroupRatings(trimmed, nmId, mpstatsToken, {
      resolvedKey: `nmId:${nmId}`,
      count: aggregate.count,
      avgRating: aggregate.count ? aggregate.avgRating : null,
    });
    groupMembers = members.length > 0 ? members : undefined;
  } catch (error) {
    groupError = error instanceof Error ? error.message : 'Не удалось загрузить группу';
  }

  return {
    marketplace: 'wb',
    article: trimmed,
    resolvedKey: `nmId:${nmId}`,
    count: aggregate.count,
    avgRating: aggregate.count ? aggregate.avgRating : null,
    syncedAt,
    source: 'mpstats',
    groupMembers,
    groupError,
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

  let comments;
  try {
    comments = await fetchMpstatsOzonComments(resolved.sku, mpstatsToken);
  } catch (error) {
    const cache = getReviewsCache();
    const offerKey = normalizeArticle(resolved.offerId ?? trimmed);
    const cached =
      cache.ozon.bySku[String(resolved.sku)] ??
      cache.ozon.byOfferId[offerKey];
    if (cached && (cached.count > 0 || cache.ozon.updatedAt)) {
      return {
        marketplace: 'ozon',
        article: trimmed,
        resolvedKey: resolved.resolvedKey,
        count: cached.count,
        avgRating: cached.count ? cached.avgRating : null,
        syncedAt: cache.ozon.updatedAt || null,
        source: 'cache',
        stale: true,
        groupError: error instanceof Error ? error.message : 'MPSTATS недоступен',
      };
    }
    throw error;
  }

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

  let groupMembers: ReviewGroupMemberRating[] | undefined;
  let groupError: string | undefined;
  try {
    const members = await buildOzonGroupRatings(
      trimmed,
      ozonClientId,
      ozonApiKey,
      mpstatsToken,
      {
        resolvedKey: resolved.resolvedKey,
        count: aggregate.count,
        avgRating: aggregate.count ? aggregate.avgRating : null,
      },
      resolved.sku,
    );
    groupMembers = members.length > 0 ? members : undefined;
  } catch (error) {
    groupError = error instanceof Error ? error.message : 'Не удалось загрузить группу';
  }

  return {
    marketplace: 'ozon',
    article: trimmed,
    resolvedKey: resolved.resolvedKey,
    count: aggregate.count,
    avgRating: aggregate.count ? aggregate.avgRating : null,
    syncedAt,
    source: 'mpstats',
    groupMembers,
    groupError,
  };
}
