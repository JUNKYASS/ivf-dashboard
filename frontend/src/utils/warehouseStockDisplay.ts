import type { WarehouseStockStatus } from '../types';

const STORAGE_KEY = 'ivf-warehouse-stock-status';
const ENABLED_KEY = 'ivf-warehouse-stock-enabled';
export const WAREHOUSE_STOCK_ENABLED_CHANGE_EVENT = 'warehouse-stock-enabled-change';

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

export function readStoredWarehouseStockEnabled(): boolean {
  try {
    const raw = sessionStorage.getItem(ENABLED_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function storeWarehouseStockEnabled(enabled: boolean): void {
  try {
    sessionStorage.setItem(ENABLED_KEY, String(enabled));
    window.dispatchEvent(new Event(WAREHOUSE_STOCK_ENABLED_CHANGE_EVENT));
  } catch {
    // ignore storage errors
  }
}
