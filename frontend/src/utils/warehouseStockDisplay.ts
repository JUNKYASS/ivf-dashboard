import type { WarehouseStockStatus } from '../types';

const STORAGE_KEY = 'ivf-warehouse-stock-status';

export function readStoredWarehouseStockStatus(): WarehouseStockStatus | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WarehouseStockStatus;
  } catch {
    return null;
  }
}

export function storeWarehouseStockStatus(status: WarehouseStockStatus): void {
  try {
    if (status.exists && status.file) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(status));
      return;
    }
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getWarehouseStockDisplayName(status: WarehouseStockStatus | null): string | null {
  if (!status?.exists) return null;
  return status.file?.originalFileName ?? 'warehouse-stock.xlsx';
}

export function getWarehouseStockMetaLine(status: WarehouseStockStatus | null): string | null {
  if (!status?.exists || !status.file) return null;

  const { originalFileName, entryCount, uploadedAt } = status.file;
  return `Остатки: ${originalFileName} · ${entryCount} поз. · ${new Date(uploadedAt).toLocaleString('ru-RU')}`;
}
