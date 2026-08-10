import path from 'path';

export type ThresholdValue = {
  threshold: number;
  remain: number;
};

export type MappingFileInfo = {
  storedFileName: string;
  originalFileName: string;
  uploadedAt: string;
} | null;

export type AppConfig = {
  texdesignUrl: string;
  thresholds: Record<string, ThresholdValue>;
  mappingFile: MappingFileInfo;
};

export type StockRow = [string, string | undefined, number];

export type OzonRow = {
  'Название склада (идентификатор склада)': string;
  Артикул: string;
  'Название товара': string;
  'Доступно на складе, шт': number;
};

export type WbRow = {
  Баркод: string;
  Количество: number;
};

export type SupplierStatus =
  | 'pending'
  | 'skipped'
  | 'processing'
  | 'success'
  | 'error';

export type GaltexSlotStatus = {
  key: string;
  label: string;
  status: SupplierStatus;
  message?: string;
  count?: number;
};

export type SupplierResult = {
  status: SupplierStatus;
  message?: string;
  count?: number;
  galtexSlots?: GaltexSlotStatus[];
};

export type GenerateResponse = {
  suppliers: Record<string, SupplierResult>;
  files: {
    ozon: string | null;
    wb: string | null;
  };
};

export type RawOrderLine = {
  marketplace: 'ozon' | 'wb';
  postingNumber: string;
  marketplaceArticle: string;
  productTitle: string | null;
  quantity: number;
};

export type WarehouseStockFileInfo = {
  originalFileName: string;
  uploadedAt: string;
  entryCount: number;
};

export type WarehouseStockStatus = {
  exists: boolean;
  file: WarehouseStockFileInfo | null;
};

export type FabricSaleType = 'cut' | 'roll';

export type OrderRow = {
  marketplaceArticle: string;
  productTitle: string | null;
  supplierArticle: string | null;
  quantity: number;
  warehouseStock: number;
  fabricSaleType: FabricSaleType | null;
  postingNumbers: string[];
};

export type OrderGroup = {
  key: string;
  title: string;
  positionCount: number;
  totalQuantity: number;
  rows: OrderRow[];
  copyMarketplaceArticles: boolean;
};

export type MarketplaceFetchStatus = {
  status: 'success' | 'error';
  message?: string;
  positionCount?: number;
};

export type OrdersFetchResponse = {
  marketplaceStatus: {
    ozon: MarketplaceFetchStatus;
    wb: MarketplaceFetchStatus;
  };
  groups: OrderGroup[];
};

export const BACKEND_ROOT = path.resolve(__dirname, '..');
export const STORAGE_DIR = process.env.STORAGE_DIR ?? path.join(BACKEND_ROOT, 'storage');
export const CONFIG_PATH = process.env.CONFIG_PATH ?? path.join(BACKEND_ROOT, 'config', 'settings.json');
export const MAPPING_PATH = path.join(STORAGE_DIR, 'mapping.xlsx');
export const WB_TITLES_CACHE_PATH = path.join(STORAGE_DIR, 'wb-titles-cache.json');
export const OUTPUT_DIR = path.join(STORAGE_DIR, 'output');
export const OZON_OUTPUT_PATH = path.join(OUTPUT_DIR, 'ozon-stocks.xlsx');
export const WB_OUTPUT_PATH = path.join(OUTPUT_DIR, 'wb-stocks.xlsx');
