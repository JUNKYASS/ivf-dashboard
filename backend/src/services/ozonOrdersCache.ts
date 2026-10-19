import type { RawOrderLine } from '../types';

const FRESH_TTL_MS = 120_000;
const STALE_MAX_AGE_MS = 15 * 60_000;

type CacheEntry = {
  fetchedAt: number;
  lines: RawOrderLine[];
};

let entry: CacheEntry | null = null;

export type OzonOrdersCacheMode = 'live' | 'fresh-cache' | 'stale-cache';

export function readFreshOzonOrdersCache(): RawOrderLine[] | null {
  if (!entry || Date.now() - entry.fetchedAt > FRESH_TTL_MS) {
    return null;
  }
  return entry.lines;
}

export function readStaleOzonOrdersCache(): RawOrderLine[] | null {
  if (!entry || Date.now() - entry.fetchedAt > STALE_MAX_AGE_MS) {
    return null;
  }
  return entry.lines;
}

export function writeOzonOrdersCache(lines: RawOrderLine[]): void {
  entry = { fetchedAt: Date.now(), lines };
}
