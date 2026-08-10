import fs from 'fs';
import path from 'path';
import { STORAGE_DIR } from '../types';
import { normalizeArticle } from './mappingLookupService';
import { readWorkbookBuffer, sheetToMatrix, stringToInt } from './parserUtils';

export const WAREHOUSE_STOCK_PATH = path.join(STORAGE_DIR, 'warehouse-stock.xlsx');
const WAREHOUSE_STOCK_META_PATH = path.join(STORAGE_DIR, 'warehouse-stock.meta.json');

export type WarehouseStockFileInfo = {
  originalFileName: string;
  uploadedAt: string;
  entryCount: number;
};

export type WarehouseStockStatus = {
  exists: boolean;
  file: WarehouseStockFileInfo | null;
};

type WarehouseStockMeta = WarehouseStockFileInfo;

function isNumericQuantity(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const parsed = Number.parseFloat(String(value).replace(/\s/g, ''));
  return Number.isFinite(parsed);
}

export function parseWarehouseStockBuffer(buffer: Buffer): Map<string, number> {
  const workbook = readWorkbookBuffer(buffer);
  const rows = sheetToMatrix(workbook);

  if (rows.length === 0) {
    throw new Error('Файл остатков пуст');
  }

  const index = new Map<string, number>();
  let parsedRows = 0;

  for (const row of rows) {
    const articleRaw = row[0];
    if (articleRaw === null || articleRaw === undefined) continue;

    const article = String(articleRaw).trim();
    if (!article) continue;

    const quantityRaw = row[1];
    if (!isNumericQuantity(quantityRaw)) continue;

    const quantity = stringToInt(quantityRaw);
    index.set(normalizeArticle(article), quantity);
    parsedRows += 1;
  }

  if (parsedRows === 0) {
    throw new Error('В файле остатков не найдено ни одной строки с артикулом и количеством');
  }

  return index;
}

function readMeta(): WarehouseStockMeta | null {
  if (!fs.existsSync(WAREHOUSE_STOCK_META_PATH)) return null;

  try {
    const raw = fs.readFileSync(WAREHOUSE_STOCK_META_PATH, 'utf-8');
    return JSON.parse(raw) as WarehouseStockMeta;
  } catch {
    return null;
  }
}

function writeMeta(meta: WarehouseStockMeta): void {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  fs.writeFileSync(WAREHOUSE_STOCK_META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
}

export function mapToRecord(index: Map<string, number>): Record<string, number> {
  return Object.fromEntries(index.entries());
}

export function buildWarehouseStockIndex(): Map<string, number> {
  if (!fs.existsSync(WAREHOUSE_STOCK_PATH)) {
    return new Map();
  }

  try {
    const buffer = fs.readFileSync(WAREHOUSE_STOCK_PATH);
    return parseWarehouseStockBuffer(buffer);
  } catch {
    return new Map();
  }
}

export function getWarehouseStockStatus(): WarehouseStockStatus {
  if (!fs.existsSync(WAREHOUSE_STOCK_PATH)) {
    return { exists: false, file: null };
  }

  const meta = readMeta();
  if (meta) {
    return { exists: true, file: meta };
  }

  const index = buildWarehouseStockIndex();
  return {
    exists: true,
    file: {
      originalFileName: 'warehouse-stock.xlsx',
      uploadedAt: fs.statSync(WAREHOUSE_STOCK_PATH).mtime.toISOString(),
      entryCount: index.size,
    },
  };
}

export function saveWarehouseStock(
  buffer: Buffer,
  originalName: string,
): { file: WarehouseStockFileInfo; stockByArticle: Record<string, number> } {
  const index = parseWarehouseStockBuffer(buffer);

  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  fs.writeFileSync(WAREHOUSE_STOCK_PATH, buffer);

  const file: WarehouseStockFileInfo = {
    originalFileName: originalName,
    uploadedAt: new Date().toISOString(),
    entryCount: index.size,
  };

  writeMeta(file);

  return {
    file,
    stockByArticle: mapToRecord(index),
  };
}
