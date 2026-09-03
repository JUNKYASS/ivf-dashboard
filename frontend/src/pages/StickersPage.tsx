import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type Marketplace = 'ozon' | 'wb';
type StickersScope = 'all' | 'unprinted';
type LoadingKey = `${Marketplace}-${StickersScope}` | null;

const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  ozon: 'Ozon',
  wb: 'Wildberries',
};

export function StickersPage() {
  const [loading, setLoading] = useState<LoadingKey>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleGenerate = async (marketplace: Marketplace, scope: StickersScope) => {
    const loadingKey: LoadingKey = `${marketplace}-${scope}`;
    setLoading(loadingKey);
    setError(null);
    setStatus(null);

    try {
      const result = await api.generateStickers(marketplace, { scope });
      const scopePart = scope === 'unprinted' ? ' (нераспечатанные)' : '';
      const skippedPart =
        result.skipped.length > 0 ? ` · пропущено ${result.skipped.length}` : '';
      setStatus(
        `Скачано ${result.count} этикеток ${MARKETPLACE_LABELS[marketplace]}${scopePart}${skippedPart}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка генерации этикеток';
      setError(
        /aborted|timeout/i.test(message) ? 'Превышено время ожидания (3 мин)' : message,
      );
    } finally {
      setLoading(null);
    }
  };

  const renderMarketplaceBlock = (marketplace: Marketplace) => {
    const label = MARKETPLACE_LABELS[marketplace];

    return (
      <section key={marketplace} className="stickers-marketplace-block">
        <h2 className="stickers-marketplace-title">{label}</h2>
        <div className="stickers-actions">
          <button
            type="button"
            className="clay-btn"
            disabled={loading !== null}
            onClick={() => void handleGenerate(marketplace, 'all')}
          >
            {loading === `${marketplace}-all` ? 'Формирование...' : 'Все этикетки'}
          </button>
          <button
            type="button"
            className="clay-btn clay-btn-secondary"
            disabled={loading !== null}
            onClick={() => void handleGenerate(marketplace, 'unprinted')}
          >
            {loading === `${marketplace}-unprinted`
              ? 'Формирование...'
              : 'Нераспечатанные'}
          </button>
        </div>
      </section>
    );
  };

  return (
    <div>
      <h1 className="page-title">Генерация стикеров</h1>

      <section className="section clay-card stickers-card">
        {renderMarketplaceBlock('ozon')}
        <hr className="stickers-marketplace-divider" />
        {renderMarketplaceBlock('wb')}

        <p className="stickers-hint">
          Ozon — FBS «Готово к отгрузке». WB — «на сборке». Ключи API задаются в{' '}
          <Link to="/settings">Настройках</Link>. Печать 58×40 мм, масштаб 100%, без
          вписывания в страницу. В кабинете Ozon лучше сразу выбрать формат этикетки 58×40.
          Нераспечатанные — этикетки, которые ещё не скачивали из этого приложения; скачивание
          в кабинете Ozon/WB не учитывается.
        </p>
      </section>

      {error && <p className="error-banner">{error}</p>}
      {status && <p className="marketplace-status marketplace-status-success">{status}</p>}
    </div>
  );
}
