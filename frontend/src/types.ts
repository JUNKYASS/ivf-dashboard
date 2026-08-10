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
  galtexThreshold: ThresholdValue;
  mappingFile: MappingFileInfo;
  hasMapping: boolean;
  hasOutput: {
    ozon: boolean;
    wb: boolean;
  };
};

export type SupplierStatus = 'pending' | 'skipped' | 'processing' | 'success' | 'error';

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

export const GALTEX_MATERIALS = [
  { key: 'galtex_byaz_220_120', label: 'Бязь 220см/120гр наб.' },
  { key: 'galtex_byaz_220_140', label: 'Бязь 220см/140гр наб.' },
  { key: 'galtex_byaz_150_120', label: 'Бязь 150см/120гр наб.' },
  { key: 'galtex_byaz_150_140', label: 'Бязь 150см/140гр наб.' },
  { key: 'galtex_byaz_150_120_solid', label: 'Бязь 150см/120гр гл/кр' },
  { key: 'galtex_byaz_150_140_solid', label: 'Бязь 150см/140гр гл/кр' },
  { key: 'galtex_poplin_220', label: 'Поплин 220' },
] as const;

export const THRESHOLD_SUPPLIERS = [
  { key: 'galtex', label: 'Galtex' },
  { key: 'td', label: 'ТексДизайн' },
  { key: 'ad', label: 'АртДизайн' },
  { key: 'tdl', label: 'ТДЛ' },
  { key: 'logos', label: 'ЛогатексПРО' },
  { key: 'tt', label: 'Традиции Текстиля' },
] as const;

export const FILE_SUPPLIERS = [
  { id: 'ad', name: 'АртДизайн (ArtDesign)', fileKey: 'ad' },
  { id: 'tdl', name: 'ТДЛ (TDL)', fileKey: 'tdl' },
  { id: 'logos', name: 'ЛогатексПРО (Logos)', fileKey: 'logos' },
  { id: 'tt', name: 'Традиции Текстиля (TT)', fileKey: 'tt' },
] as const;

export type WbTitlesCacheStatus = {
  exists: boolean;
  updatedAt: string | null;
  count: number;
};

export type MarketplaceApiPublicConfig = {
  ozon: {
    clientIdConfigured: boolean;
    clientIdMask: string | null;
    apiKeyConfigured: boolean;
    apiKeyMask: string | null;
  };
  wb: {
    apiTokenConfigured: boolean;
    apiTokenMask: string | null;
  };
  wbTitlesCache: WbTitlesCacheStatus;
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

export type WarehouseStockUploadResponse = {
  file: WarehouseStockFileInfo;
  stockByArticle: Record<string, number>;
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
