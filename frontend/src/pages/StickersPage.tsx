import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type Marketplace = 'ozon' | 'wb';

export function StickersPage() {
  const [loading, setLoading] = useState<Marketplace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleGenerate = async (marketplace: Marketplace) => {
    setLoading(marketplace);
    setError(null);
    setStatus(null);

    try {
      const result = await api.generateStickers(marketplace);
      const skippedPart =
        result.skipped.length > 0 ? ` · пропущено ${result.skipped.length}` : '';
      setStatus(`Скачано ${result.count} этикеток${skippedPart}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка генерации этикеток';
      setError(
        /aborted|timeout/i.test(message) ? 'Превышено время ожидания (3 мин)' : message,
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <h1 className="page-title">Генерация стикеров</h1>

      <section className="section clay-card">
        <div className="stickers-actions">
          <button
            type="button"
            className="clay-btn"
            disabled={loading !== null}
            onClick={() => void handleGenerate('ozon')}
          >
            {loading === 'ozon' ? 'Формирование...' : 'Этикетки Ozon'}
          </button>
          <button
            type="button"
            className="clay-btn"
            disabled={loading !== null}
            onClick={() => void handleGenerate('wb')}
          >
            {loading === 'wb' ? 'Формирование...' : 'Этикетки WB'}
          </button>
        </div>

        <p className="stickers-hint">
          Ozon — FBS «Готово к отгрузке». WB — «на сборке». Ключи API задаются в{' '}
          <Link to="/orders">Обработке заказов</Link>. Печать 58×40 мм, масштаб 100%, без
          вписывания в страницу. В кабинете Ozon лучше сразу выбрать формат этикетки 58×40.
        </p>
      </section>

      {error && <p className="error-banner">{error}</p>}
      {status && <p className="marketplace-status marketplace-status-success">{status}</p>}
    </div>
  );
}
