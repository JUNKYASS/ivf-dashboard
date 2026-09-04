import { useState } from 'react';
import { api } from '../api/client';
import type { MarketplaceApiPublicConfig } from '../types';
import { CollapsibleSection } from './CollapsibleSection';

type Props = {
  config: MarketplaceApiPublicConfig | null;
  onConfigChange: (config: MarketplaceApiPublicConfig) => void;
};

export function MarketplaceApiBlock({ config, onConfigChange }: Props) {
  const [ozonClientId, setOzonClientId] = useState('');
  const [ozonApiKey, setOzonApiKey] = useState('');
  const [wbApiToken, setWbApiToken] = useState('');
  const [mpstatsToken, setMpstatsToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const configuredCount = [
    config?.ozon.clientIdConfigured,
    config?.ozon.apiKeyConfigured,
    config?.wb.apiTokenConfigured,
    config?.mpstats.apiTokenConfigured,
  ].filter(Boolean).length;

  const handleSave = async () => {
    if (!ozonClientId && !ozonApiKey && !wbApiToken && !mpstatsToken) return;

    setSaving(true);
    setSaved(false);
    try {
      const data = await api.saveMarketplaceApiConfig({
        ozonClientId: ozonClientId || undefined,
        ozonApiKey: ozonApiKey || undefined,
        wbApiToken: wbApiToken || undefined,
        mpstatsToken: mpstatsToken || undefined,
      });
      setOzonClientId('');
      setOzonApiKey('');
      setWbApiToken('');
      setMpstatsToken('');
      setSaved(true);
      onConfigChange(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CollapsibleSection title="API маркетплейсов" summary={`Ключи: ${configuredCount}/4`}>
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
        <div className="field">
          <label htmlFor="mpstats-api-token">MPSTATS Token</label>
          <input
            id="mpstats-api-token"
            className="clay-input"
            type="password"
            autoComplete="off"
            placeholder={
              config?.mpstats.apiTokenConfigured
                ? `Сохранён (${config.mpstats.apiTokenMask})`
                : 'Введите токен MPSTATS'
            }
            value={mpstatsToken}
            onChange={(e) => setMpstatsToken(e.target.value)}
          />
        </div>
      </div>

      <div className="marketplace-api-actions">
        <button
          type="button"
          className="clay-btn"
          disabled={saving || (!ozonClientId && !ozonApiKey && !wbApiToken && !mpstatsToken)}
          onClick={() => void handleSave()}
        >
          {saving ? 'Сохранение...' : 'Сохранить ключи'}
        </button>
        {saved && <span className="save-hint">Ключи сохранены в .env</span>}
      </div>
    </CollapsibleSection>
  );
}
