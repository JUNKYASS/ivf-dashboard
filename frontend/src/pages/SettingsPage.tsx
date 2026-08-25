import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { MappingBlock } from '../components/MappingBlock';
import { MarketplaceApiBlock } from '../components/MarketplaceApiBlock';
import { OrdersSettingsBlock } from '../components/OrdersSettingsBlock';
import { ThresholdsBlock } from '../components/ThresholdsBlock';
import type { AppConfig, MarketplaceApiPublicConfig, WarehouseStockStatus } from '../types';
import {
  readStoredWarehouseStockEnabled,
  readStoredWarehouseStockStatus,
  storeWarehouseStockEnabled,
  storeWarehouseStockStatus,
} from '../utils/warehouseStockDisplay';

export function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [apiConfig, setApiConfig] = useState<MarketplaceApiPublicConfig | null>(null);
  const [warehouseStockEnabled, setWarehouseStockEnabled] = useState(readStoredWarehouseStockEnabled);
  const [warehouseStatus, setWarehouseStatus] = useState<WarehouseStockStatus | null>(
    readStoredWarehouseStockStatus,
  );
  const [mappingFile, setMappingFile] = useState<File | null>(null);
  const [mappingUploading, setMappingUploading] = useState(false);
  const [warehouseFile, setWarehouseFile] = useState<File | null>(null);
  const [warehouseUploading, setWarehouseUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const data = await api.getConfig();
    setConfig(data);
  }, []);

  const loadApiConfig = useCallback(async () => {
    const data = await api.getMarketplaceApiConfig();
    setApiConfig(data);
  }, []);

  const loadWarehouseStatus = useCallback(async () => {
    const data = await api.getWarehouseStockStatus();
    setWarehouseStatus(data);
    storeWarehouseStockStatus(data);
  }, []);

  useEffect(() => {
    void Promise.all([loadConfig(), loadApiConfig(), loadWarehouseStatus()]).catch((err: Error) =>
      setError(err.message),
    );
  }, [loadConfig, loadApiConfig, loadWarehouseStatus]);

  const handleMappingFileChange = async (file: File | null) => {
    setMappingFile(file);
    if (!file) return;

    setMappingUploading(true);
    setError(null);

    try {
      const data = await api.uploadMapping(file);
      setConfig(data);
      setMappingFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки mapping-файла');
      setMappingFile(null);
    } finally {
      setMappingUploading(false);
    }
  };

  const handleThresholdSave = async (key: string, threshold: number, remain: number) => {
    const data = await api.saveThreshold(key, threshold, remain);
    setConfig(data);
  };

  const handleWarehouseStockEnabledChange = (enabled: boolean) => {
    setWarehouseStockEnabled(enabled);
    storeWarehouseStockEnabled(enabled);
  };

  const handleWarehouseFileChange = async (file: File | null) => {
    setWarehouseFile(file);
    if (!file) return;

    setWarehouseUploading(true);
    setError(null);

    try {
      const result = await api.uploadWarehouseStock(file);
      const nextStatus: WarehouseStockStatus = { exists: true, file: result.file };
      setWarehouseStatus(nextStatus);
      storeWarehouseStockStatus(nextStatus);
      setWarehouseFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки файла остатков');
      setWarehouseFile(null);
    } finally {
      setWarehouseUploading(false);
    }
  };

  if (!config || !apiConfig) {
    return (
      <div>
        <h1 className="page-title">Настройки</h1>
        {error ? <p className="text-error">{error}</p> : <div className="spinner" />}
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Настройки</h1>

      <MappingBlock
        mappingFile={config.mappingFile}
        hasMapping={config.hasMapping}
        file={mappingFile}
        uploading={mappingUploading}
        onFileChange={(file) => void handleMappingFileChange(file)}
      />

      <ThresholdsBlock
        thresholds={config.thresholds}
        galtexThreshold={config.galtexThreshold}
        onSave={handleThresholdSave}
      />

      <MarketplaceApiBlock config={apiConfig} onConfigChange={setApiConfig} />

      <OrdersSettingsBlock
        config={apiConfig}
        onConfigChange={setApiConfig}
        warehouseStockEnabled={warehouseStockEnabled}
        onWarehouseStockEnabledChange={handleWarehouseStockEnabledChange}
        warehouseStatus={warehouseStatus}
        warehouseFile={warehouseFile}
        warehouseUploading={warehouseUploading}
        onWarehouseFileChange={(file) => void handleWarehouseFileChange(file)}
      />

      {error && <p className="error-banner">{error}</p>}
    </div>
  );
}
