import fs from 'fs';
import path from 'path';
import { BACKEND_ROOT } from '../types';

export type PrintedMarketplace = 'ozon' | 'wb';

/** Заказы в stickers — окно 30 дней; TTL с запасом на «забыли нажать generate». */
export const PRINTED_LABELS_TTL_DAYS = 45;

const PRINTED_LABELS_TTL_MS = PRINTED_LABELS_TTL_DAYS * 24 * 60 * 60 * 1000;

type PrintedLabelsStore = {
  ozon: Record<string, string>;
  wb: Record<string, string>;
};

function storageDir(): string {
  return process.env.STORAGE_DIR ?? path.join(BACKEND_ROOT, 'storage');
}

function printedLabelsPath(): string {
  return path.join(storageDir(), 'printed-labels.json');
}

function emptyStore(): PrintedLabelsStore {
  return { ozon: {}, wb: {} };
}

function readStore(): PrintedLabelsStore {
  const filePath = printedLabelsPath();
  if (!fs.existsSync(filePath)) return emptyStore();

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PrintedLabelsStore>;
    return {
      ozon: parsed.ozon ?? {},
      wb: parsed.wb ?? {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: PrintedLabelsStore): void {
  fs.mkdirSync(storageDir(), { recursive: true });
  fs.writeFileSync(printedLabelsPath(), JSON.stringify(store, null, 2), 'utf-8');
}

export function isExpiredPrintedAt(printedAt: string, nowMs = Date.now()): boolean {
  const ts = Date.parse(printedAt);
  if (Number.isNaN(ts)) return true;
  return nowMs - ts > PRINTED_LABELS_TTL_MS;
}

function pruneExpiredBucket(bucket: Record<string, string>, nowMs = Date.now()): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [id, printedAt] of Object.entries(bucket)) {
    if (!isExpiredPrintedAt(printedAt, nowMs)) {
      next[id] = printedAt;
    }
  }
  return next;
}

/** Удаляет записи старше TTL в обоих маркетплейсах. */
export function pruneExpiredEntries(store: PrintedLabelsStore, nowMs = Date.now()): void {
  store.ozon = pruneExpiredBucket(store.ozon, nowMs);
  store.wb = pruneExpiredBucket(store.wb, nowMs);
}

export function isPrinted(marketplace: PrintedMarketplace, id: string): boolean {
  const store = readStore();
  const printedAt = store[marketplace][id.trim()];
  if (!printedAt) return false;
  return !isExpiredPrintedAt(printedAt);
}

export function markPrinted(marketplace: PrintedMarketplace, ids: string[]): void {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return;

  const store = readStore();
  pruneExpiredEntries(store);
  const now = new Date().toISOString();
  for (const id of uniqueIds) {
    store[marketplace][id] = now;
  }
  writeStore(store);
}

export function pruneMarketplace(marketplace: PrintedMarketplace, currentIds: string[]): void {
  const current = new Set(currentIds.map((id) => id.trim()).filter(Boolean));
  const store = readStore();
  pruneExpiredEntries(store);

  const next: Record<string, string> = {};
  for (const [id, printedAt] of Object.entries(store[marketplace])) {
    if (current.has(id) && !isExpiredPrintedAt(printedAt)) {
      next[id] = printedAt;
    }
  }

  store[marketplace] = next;
  writeStore(store);
}

export function filterUnprinted(marketplace: PrintedMarketplace, ids: string[]): string[] {
  const store = readStore();
  const nowMs = Date.now();
  return ids.filter((id) => {
    const printedAt = store[marketplace][id.trim()];
    if (!printedAt) return true;
    return isExpiredPrintedAt(printedAt, nowMs);
  });
}
