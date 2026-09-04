import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type {
  MarketplaceApiPublicConfig,
  OzonProductCacheStatus,
  ReviewsCacheStatus,
  WarehouseStockStatus,
  WbTitlesCacheStatus,
} from '../types';
import { FileUploadField } from './FileUploadField';
import { CollapsibleSection } from './CollapsibleSection';
import { getWarehouseStockDisplayName, getWarehouseStockMetaLine } from '../utils/warehouseStockDisplay';

type Props = {
  config: MarketplaceApiPublicConfig | null;
  onConfigChange: (config: MarketplaceApiPublicConfig) => void;
  warehouseStockEnabled: boolean;
  onWarehouseStockEnabledChange: (enabled: boolean) => void;
  warehouseStatus: WarehouseStockStatus | null;
  warehouseFile: File | null;
  warehouseUploading: boolean;
  onWarehouseFileChange: (file: File | null) => void;
};

function formatCacheDate(iso: string | null): string {
  if (!iso) return 'не обновлялся';
  return new Date(iso).toLocaleString('ru-RU');
}

function WarehouseStockStatusLine({ status }: { status: WarehouseStockStatus | null }) {
  if (status?.exists) return null;

  return (
    <p className="warehouse-stock-status">
      Файл остатков не загружен — колонка «Наш склад» будет 0
    </p>
  );
}

function buildSummary(
  warehouseStockEnabled: boolean,
  warehouseStatus: WarehouseStockStatus | null,
): string {
  if (!warehouseStockEnabled) {
    return 'Склад: выкл';
  }

  const entryCount = warehouseStatus?.file?.entryCount;
  return entryCount !== undefined ? `Склад: вкл · ${entryCount} поз.` : 'Склад: вкл';
}

export function OrdersSettingsBlock({
  config,
  onConfigChange,
  warehouseStockEnabled,
  onWarehouseStockEnabledChange,
  warehouseStatus,
  warehouseFile,
  warehouseUploading,
  onWarehouseFileChange,
}: Props) {
  const [syncingTitles, setSyncingTitles] = useState(false);
  const [titlesCache, setTitlesCache] = useState<WbTitlesCacheStatus | null>(config?.wbTitlesCache ?? null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncingOzonProducts, setSyncingOzonProducts] = useState(false);
  const [ozonProductCache, setOzonProductCache] = useState<OzonProductCacheStatus | null>(
    config?.ozonProductCache ?? null,
  );
  const [ozonSyncMessage, setOzonSyncMessage] = useState<string | null>(null);
  const [syncingWbReviews, setSyncingWbReviews] = useState(false);
  const [wbReviewsCache, setWbReviewsCache] = useState<ReviewsCacheStatus['wb'] | null>(
    config?.reviewsCache?.wb ?? null,
  );
  const [wbReviewsSyncMessage, setWbReviewsSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (config?.wbTitlesCache) {
      setTitlesCache(config.wbTitlesCache);
    }
  }, [config?.wbTitlesCache]);

  useEffect(() => {
    if (config?.ozonProductCache) {
      setOzonProductCache(config.ozonProductCache);
    }
  }, [config?.ozonProductCache]);

  useEffect(() => {
    if (config?.reviewsCache?.wb) {
      setWbReviewsCache(config.reviewsCache.wb);
    }
  }, [config?.reviewsCache?.wb]);

  const handleSyncTitles = async () => {
    setSyncingTitles(true);
    setSyncMessage(null);
    try {
      const status = await api.syncWbTitlesCache();
      setTitlesCache(status);
      setSyncMessage(`Кэш обновлён: ${status.count} товаров`);
      if (config) {
        onConfigChange({ ...config, wbTitlesCache: status });
      }
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Ошибка синхронизации');
    } finally {
      setSyncingTitles(false);
    }
  };

  const handleSyncOzonProducts = async () => {
    setSyncingOzonProducts(true);
    setOzonSyncMessage(null);
    try {
      const status = await api.syncOzonProductCache();
      setOzonProductCache(status);
      setOzonSyncMessage(`Кэш обновлён: ${status.count} фото`);
      if (config) {
        onConfigChange({ ...config, ozonProductCache: status });
      }
    } catch (error) {
      setOzonSyncMessage(error instanceof Error ? error.message : 'Ошибка синхронизации');
    } finally {
      setSyncingOzonProducts(false);
    }
  };

  const handleSyncWbReviews = async () => {
    setSyncingWbReviews(true);
    setWbReviewsSyncMessage(null);
    try {
      const status = await api.syncWbReviewsCache();
      setWbReviewsCache(status);
      setWbReviewsSyncMessage(`Кэш отзывов: ${status.reviewCount} отзывов по ${status.productCount} товарам`);
      if (config) {
        onConfigChange({
          ...config,
          reviewsCache: {
            wb: status,
            ozon: config.reviewsCache?.ozon ?? {
              exists: false,
              updatedAt: null,
              reviewCount: 0,
              productCount: 0,
              source: 'mpstats',
            },
          },
        });
      }
    } catch (error) {
      setWbReviewsSyncMessage(error instanceof Error ? error.message : 'Ошибка синхронизации');
    } finally {
      setSyncingWbReviews(false);
    }
  };

  return (
    <CollapsibleSection
      title="Настройки обработки заказов"
      summary={buildSummary(warehouseStockEnabled, warehouseStatus)}
    >
      <h3 className="orders-settings-subtitle">Кэш товаров WB</h3>
      <div className="wb-titles-cache-block wb-titles-cache-block-nested">
        <p className="wb-titles-cache-meta">
          {titlesCache?.count ?? 0} товаров, {formatCacheDate(titlesCache?.updatedAt ?? null)}
        </p>
        <p className="wb-titles-cache-hint">
          WB не отдаёт названия и фото в заказах. Одна кнопка обновляет кэш названий и URL
          картинок — затем они подставляются при «Получить заказы».
        </p>
        <button
          type="button"
          className="clay-btn clay-btn-secondary"
          disabled={syncingTitles || !config?.wb.apiTokenConfigured}
          onClick={() => void handleSyncTitles()}
        >
          {syncingTitles ? 'Синхронизация...' : 'Обновить кэш WB'}
        </button>
        {syncMessage && <span className="wb-titles-cache-message">{syncMessage}</span>}
      </div>

      <div className="orders-settings-divider" />

      <h3 className="orders-settings-subtitle">Кэш отзывов WB</h3>
      <div className="wb-titles-cache-block wb-titles-cache-block-nested">
        <p className="wb-titles-cache-meta">
          {wbReviewsCache?.reviewCount ?? 0} отзывов,{' '}
          {formatCacheDate(wbReviewsCache?.updatedAt ?? null)}
        </p>
        <p className="wb-titles-cache-hint">
          Опциональная полная синхронизация отзывов. Для проверки по артикулу на странице «Отзывы»
          достаточно live-запроса — но токен WB должен включать категорию «Отзывы и вопросы».
        </p>
        <button
          type="button"
          className="clay-btn clay-btn-secondary"
          disabled={syncingWbReviews || !config?.wb.apiTokenConfigured}
          onClick={() => void handleSyncWbReviews()}
        >
          {syncingWbReviews ? 'Синхронизация...' : 'Синхронизировать отзывы WB'}
        </button>
        {wbReviewsSyncMessage && (
          <span className="wb-titles-cache-message">{wbReviewsSyncMessage}</span>
        )}
      </div>

      <div className="orders-settings-divider" />

      <h3 className="orders-settings-subtitle">Кэш товаров Ozon</h3>
      <div className="wb-titles-cache-block wb-titles-cache-block-nested">
        <p className="wb-titles-cache-meta">
          {ozonProductCache?.count ?? 0} фото, {formatCacheDate(ozonProductCache?.updatedAt ?? null)}
        </p>
        <p className="wb-titles-cache-hint">
          Ozon не отдаёт картинки в заказах. Кэш обновляется отдельно и используется при загрузке
          заказов без дополнительных запросов.
        </p>
        <button
          type="button"
          className="clay-btn clay-btn-secondary"
          disabled={
            syncingOzonProducts ||
            !config?.ozon.clientIdConfigured ||
            !config?.ozon.apiKeyConfigured
          }
          onClick={() => void handleSyncOzonProducts()}
        >
          {syncingOzonProducts ? 'Синхронизация...' : 'Обновить кэш Ozon'}
        </button>
        {ozonSyncMessage && <span className="wb-titles-cache-message">{ozonSyncMessage}</span>}
      </div>

      <div className="orders-settings-divider" />

      <label className="toggle-field">
        <input
          type="checkbox"
          className="toggle-input"
          checked={warehouseStockEnabled}
          onChange={(e) => onWarehouseStockEnabledChange(e.target.checked)}
        />
        <span className="toggle-switch" aria-hidden />
        <span className="toggle-label">Учитывать остатки нашего склада</span>
      </label>

      {warehouseStockEnabled && (
        <div className="orders-settings-warehouse">
          <p className="section-hint">
            Excel: колонка 1 — артикул маркетплейса, колонка 2 — количество на складе
          </p>
          <FileUploadField
            file={warehouseFile}
            onChange={onWarehouseFileChange}
            placeholder="Загрузить остатки нашего склада"
            loadedFileName={getWarehouseStockDisplayName(warehouseStatus)}
            loadedFileMeta={getWarehouseStockMetaLine(warehouseStatus)}
          />
          {warehouseUploading && <p className="warehouse-stock-uploading">Загрузка файла...</p>}
          <WarehouseStockStatusLine status={warehouseStatus} />
        </div>
      )}
    </CollapsibleSection>
  );
}
