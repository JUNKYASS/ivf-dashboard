import axios, { isAxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import { WB_CONTENT_API_BASE_URL } from '../constants';
import { STORAGE_DIR, WB_TITLES_CACHE_PATH } from '../types';
import { normalizeArticle } from './mappingLookupService';

type WbCardPhoto = {
  big?: string;
  c246x328?: string;
  c516x688?: string;
  square?: string;
  tm?: string;
};

type WbCard = {
  nmID?: number;
  vendorCode?: string;
  title?: string;
  updatedAt?: string;
  photos?: WbCardPhoto[];
};

type WbCardsListResponse = {
  cards?: WbCard[];
  cursor?: {
    updatedAt?: string;
    nmID?: number;
    total?: number;
  };
};

export type WbTitlesCacheFile = {
  updatedAt: string;
  byArticle: Record<string, string>;
  byNmId: Record<string, string>;
  imageByArticle: Record<string, string>;
  imageByNmId: Record<string, string>;
};

export type WbTitlesCacheStatus = {
  exists: boolean;
  updatedAt: string | null;
  count: number;
};

const PAGE_SIZE = 100;
const MIN_REQUEST_INTERVAL_MS = 650;
const MAX_PAGES = 500;
const MAX_RETRIES = 5;

let lastRequestAt = 0;
let memoryCache: WbTitlesCacheFile | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyCache(): WbTitlesCacheFile {
  return {
    updatedAt: '',
    byArticle: {},
    byNmId: {},
    imageByArticle: {},
    imageByNmId: {},
  };
}

function normalizeCache(raw: Partial<WbTitlesCacheFile> | null | undefined): WbTitlesCacheFile {
  return {
    updatedAt: raw?.updatedAt ?? '',
    byArticle: raw?.byArticle ?? {},
    byNmId: raw?.byNmId ?? {},
    imageByArticle: raw?.imageByArticle ?? {},
    imageByNmId: raw?.imageByNmId ?? {},
  };
}

function pickCardImageUrl(photos: WbCardPhoto[] | undefined): string | null {
  const photo = photos?.[0];
  if (!photo) return null;
  const url =
    photo.c246x328?.trim() ||
    photo.tm?.trim() ||
    photo.square?.trim() ||
    photo.big?.trim() ||
    '';
  return url || null;
}

function readCacheFromDisk(): WbTitlesCacheFile {
  if (!fs.existsSync(WB_TITLES_CACHE_PATH)) {
    return emptyCache();
  }

  try {
    const raw = fs.readFileSync(WB_TITLES_CACHE_PATH, 'utf-8');
    return normalizeCache(JSON.parse(raw) as Partial<WbTitlesCacheFile>);
  } catch {
    return emptyCache();
  }
}

function writeCacheToDisk(cache: WbTitlesCacheFile): void {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const tempPath = path.join(STORAGE_DIR, 'wb-titles-cache.tmp.json');
  fs.writeFileSync(tempPath, JSON.stringify(cache, null, 2), 'utf-8');
  fs.renameSync(tempPath, WB_TITLES_CACHE_PATH);
  memoryCache = cache;
}

export function getWbTitlesCache(): WbTitlesCacheFile {
  if (!memoryCache) {
    memoryCache = readCacheFromDisk();
  }
  return memoryCache;
}

export function getWbTitlesCacheStatus(): WbTitlesCacheStatus {
  const cache = getWbTitlesCache();
  const count = Object.keys(cache.byArticle).length;

  return {
    exists: count > 0,
    updatedAt: cache.updatedAt || null,
    count,
  };
}

export function lookupWbProductTitle(article: string, nmId?: number): string | null {
  const cache = getWbTitlesCache();
  const byArticle = cache.byArticle[normalizeArticle(article)];
  if (byArticle) return byArticle;

  if (nmId !== undefined) {
    return cache.byNmId[String(nmId)] ?? null;
  }

  return null;
}

export function lookupWbProductImage(article: string, nmId?: number): string | null {
  const cache = getWbTitlesCache();
  const byArticle = cache.imageByArticle[normalizeArticle(article)];
  if (byArticle) return byArticle;

  if (nmId !== undefined) {
    return cache.imageByNmId[String(nmId)] ?? null;
  }

  return null;
}

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
}

function getRetryDelayMs(error: unknown): number {
  if (!isAxiosError(error) || error.response?.status !== 429) {
    return 0;
  }

  const headers = error.response.headers;
  const retrySec = Number(headers['x-ratelimit-retry'] ?? headers['x-ratelimit-reset'] ?? 3);
  return Math.max(retrySec, 1) * 1000;
}

async function fetchCardsPage(
  apiToken: string,
  pageCursor?: { updatedAt: string; nmID: number },
): Promise<WbCardsListResponse> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    await waitForRateLimit();

    try {
      lastRequestAt = Date.now();
      const response = await axios.post<WbCardsListResponse>(
        `${WB_CONTENT_API_BASE_URL}/content/v2/get/cards/list`,
        {
          settings: {
            sort: { ascending: true },
            filter: { withPhoto: -1 },
            cursor: {
              limit: PAGE_SIZE,
              ...(pageCursor ?? {}),
            },
          },
        },
        {
          headers: { Authorization: apiToken },
          timeout: 30_000,
        },
      );

      return response.data;
    } catch (error) {
      const retryDelayMs = getRetryDelayMs(error);
      if (retryDelayMs > 0 && attempt < MAX_RETRIES - 1) {
        await sleep(retryDelayMs);
        continue;
      }
      throw error;
    }
  }

  throw new Error('WB Content API: превышен лимит запросов');
}

function getNextPageCursor(
  data: WbCardsListResponse,
  cards: WbCard[],
): { updatedAt: string; nmID: number } | null {
  if (data.cursor?.updatedAt && data.cursor.nmID !== undefined) {
    return { updatedAt: data.cursor.updatedAt, nmID: data.cursor.nmID };
  }

  const lastCard = cards[cards.length - 1];
  if (lastCard?.updatedAt && lastCard.nmID !== undefined) {
    return { updatedAt: lastCard.updatedAt, nmID: lastCard.nmID };
  }

  return null;
}

function addCardsToCache(cache: WbTitlesCacheFile, cards: WbCard[]): void {
  for (const card of cards) {
    const title = card.title?.trim();
    const imageUrl = pickCardImageUrl(card.photos);

    if (card.vendorCode) {
      const articleKey = normalizeArticle(card.vendorCode);
      if (title) {
        cache.byArticle[articleKey] = title;
      }
      if (imageUrl) {
        cache.imageByArticle[articleKey] = imageUrl;
      }
    }

    if (card.nmID !== undefined) {
      const nmKey = String(card.nmID);
      if (title) {
        cache.byNmId[nmKey] = title;
      }
      if (imageUrl) {
        cache.imageByNmId[nmKey] = imageUrl;
      }
    }
  }
}

export async function syncWbTitlesCache(apiToken: string): Promise<WbTitlesCacheStatus> {
  const cache = emptyCache();
  let pageCursor: { updatedAt: string; nmID: number } | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await fetchCardsPage(apiToken, pageCursor);
    const cards = data.cards ?? [];
    if (cards.length === 0) break;

    addCardsToCache(cache, cards);

    if (cards.length < PAGE_SIZE) break;

    const nextCursor = getNextPageCursor(data, cards);
    if (!nextCursor) break;

    pageCursor = nextCursor;
  }

  cache.updatedAt = new Date().toISOString();
  writeCacheToDisk(cache);

  return getWbTitlesCacheStatus();
}
