import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MarketplaceApiPublicConfig, WarehouseStockStatus, WbTitlesCacheStatus } from '../types';
import { FileUploadField } from './FileUploadField';
import { CollapsibleSection } from './CollapsibleSection';

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
  if (!status?.exists || !status.file) {
    return (
      <p className="warehouse-stock-status">
        Файл остатков не загружен — колонка «Наш склад» будет 0
      </p>
    );
  }

  return (
    <p className="warehouse-stock-status warehouse-stock-status-loaded">
      Остатки: {status.file.originalFileName} · {status.file.entryCount} поз. ·{' '}
      {new Date(status.file.uploadedAt).toLocaleString('ru-RU')}
    </p>
  );
}

function buildSummary(
  configuredCount: number,
  warehouseStockEnabled: boolean,
  warehouseStatus: WarehouseStockStatus | null,
): string {
  const keysPart = `Ключи: ${configuredCount}/3`;
  if (!warehouseStockEnabled) {
    return `${keysPart} · Склад: выкл`;
  }

  const entryCount = warehouseStatus?.file?.entryCount;
  const warehousePart =
    entryCount !== undefined ? `Склад: вкл · ${entryCount} поз.` : 'Склад: вкл';
  return `${keysPart} · ${warehousePart}`;
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
  const [ozonClientId, setOzonClientId] = useState('');
  const [ozonApiKey, setOzonApiKey] = useState('');
  const [wbApiToken, setWbApiToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncingTitles, setSyncingTitles] = useState(false);
  const [titlesCache, setTitlesCache] = useState<WbTitlesCacheStatus | null>(config?.wbTitlesCache ?? null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (config?.wbTitlesCache) {
      setTitlesCache(config.wbTitlesCache);
    }
  }, [config?.wbTitlesCache]);

  const configuredCount = [
    config?.ozon.clientIdConfigured,
    config?.ozon.apiKeyConfigured,
    config?.wb.apiTokenConfigured,
  ].filter(Boolean).length;

  const handleSave = async () => {
    if (!ozonClientId && !ozonApiKey && !wbApiToken) return;

    setSaving(true);
    setSaved(false);
    try {
      const data = await api.saveMarketplaceApiConfig({
        ozonClientId: ozonClientId || undefined,
        ozonApiKey: ozonApiKey || undefined,
        wbApiToken: wbApiToken || undefined,
      });
      setOzonClientId('');
      setOzonApiKey('');
      setWbApiToken('');
      setSaved(true);
      setTitlesCache(data.wbTitlesCache);
      onConfigChange(data);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <CollapsibleSection
      title="Настройки обработки заказов"
      summary={buildSummary(configuredCount, warehouseStockEnabled, warehouseStatus)}
    >
      <h3 className="orders-settings-subtitle">API маркетплейсов</h3>
      <div className="marketplace-api-grid">
        <div className="field">
          <label htmlFor="ozon-client-id">Ozon Client-Id</label>
          <input
            id="ozon-client-id"
            className="clay-input"
            type="password"
            autoComplete="off"
            placeholder={
              config?.ozon.clientIdConfigured
                ? `Сохранён (${config.ozon.clientIdMask})`
                : 'Введите Client-Id'
            }
            value={ozonClientId}
            onChange={(e) => setOzonClientId(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="ozon-api-key">Ozon Api-Key</label>
          <input
            id="ozon-api-key"
            className="clay-input"
            type="password"
            autoComplete="off"
            placeholder={
              config?.ozon.apiKeyConfigured
                ? `Сохранён (${config.ozon.apiKeyMask})`
                : 'Введите Api-Key'
            }
            value={ozonApiKey}
            onChange={(e) => setOzonApiKey(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="wb-api-token">WB API Token</label>
          <input
            id="wb-api-token"
            className="clay-input"
            type="password"
            autoComplete="off"
            placeholder={
              config?.wb.apiTokenConfigured
                ? `Сохранён (${config.wb.apiTokenMask})`
                : 'Введите токен'
            }
            value={wbApiToken}
            onChange={(e) => setWbApiToken(e.target.value)}
          />
        </div>
      </div>

      <div className="marketplace-api-actions">
        <button
          type="button"
          className="clay-btn"
          disabled={saving || (!ozonClientId && !ozonApiKey && !wbApiToken)}
          onClick={() => void handleSave()}
        >
          {saving ? 'Сохранение...' : 'Сохранить ключи'}
        </button>
        {saved && <span className="save-hint">Ключи сохранены в .env</span>}
      </div>

      <div className="orders-settings-divider" />

      <h3 className="orders-settings-subtitle">Кэш названий WB</h3>
      <div className="wb-titles-cache-block wb-titles-cache-block-nested">
        <p className="wb-titles-cache-meta">
          {titlesCache?.count ?? 0} товаров, {formatCacheDate(titlesCache?.updatedAt ?? null)}
        </p>
        <p className="wb-titles-cache-hint">
          WB не отдаёт названия в заказах. Кэш обновляется отдельно и используется при загрузке
          заказов без дополнительных запросов.
        </p>
        <button
          type="button"
          className="clay-btn clay-btn-secondary"
          disabled={syncingTitles || !config?.wb.apiTokenConfigured}
          onClick={() => void handleSyncTitles()}
        >
          {syncingTitles ? 'Синхронизация...' : 'Обновить кэш названий WB'}
        </button>
        {syncMessage && <span className="wb-titles-cache-message">{syncMessage}</span>}
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
          />
          {warehouseUploading && <p className="warehouse-stock-uploading">Загрузка файла...</p>}
          <WarehouseStockStatusLine status={warehouseStatus} />
        </div>
      )}
    </CollapsibleSection>
  );
}
