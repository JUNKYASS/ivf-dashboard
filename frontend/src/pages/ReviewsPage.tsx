import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { CollapsibleSection } from '../components/CollapsibleSection';
import type {
  MarketplaceApiPublicConfig,
  ReviewRatingLookupResult,
  ReviewsCacheStatus,
} from '../types';

function formatCacheDate(iso: string | null): string {
  if (!iso) return 'не проверялся';
  return new Date(iso).toLocaleString('ru-RU');
}

function formatRating(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(2);
}

function formatSource(source: ReviewRatingLookupResult['source']): string {
  if (source === 'mpstats') return 'MPSTATS';
  if (source === 'wb_api') return 'WB API';
  return 'кэш';
}

type RatingResultProps = {
  label: string;
  result: ReviewRatingLookupResult | null;
  loading: boolean;
  error: string | null;
};

function RatingResult({ label, result, loading, error }: RatingResultProps) {
  if (loading) {
    return <p className="reviews-result-message">Проверяем {label}...</p>;
  }

  if (error) {
    return <p className="reviews-result-error">{error}</p>;
  }

  if (!result) return null;

  if (result.count === 0) {
    return (
      <p className="reviews-result-message">
        {label}: отзывов не найдено (источник: {formatSource(result.source)})
      </p>
    );
  }

  return (
    <div className="reviews-result-card">
      <p className="reviews-result-title">{label}</p>
      <p className="reviews-result-rating">{formatRating(result.avgRating)}</p>
      <p className="reviews-result-meta">
        {result.count} отзывов · {formatSource(result.source)} ·{' '}
        {formatCacheDate(result.syncedAt)}
      </p>
    </div>
  );
}

export function ReviewsPage() {
  const [apiConfig, setApiConfig] = useState<MarketplaceApiPublicConfig | null>(null);
  const [reviewsCache, setReviewsCache] = useState<ReviewsCacheStatus | null>(null);
  const [wbArticle, setWbArticle] = useState('');
  const [ozonArticle, setOzonArticle] = useState('');
  const [wbResult, setWbResult] = useState<ReviewRatingLookupResult | null>(null);
  const [ozonResult, setOzonResult] = useState<ReviewRatingLookupResult | null>(null);
  const [wbLoading, setWbLoading] = useState(false);
  const [ozonLoading, setOzonLoading] = useState(false);
  const [wbError, setWbError] = useState<string | null>(null);
  const [ozonError, setOzonError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const [config, status] = await Promise.all([
      api.getMarketplaceApiConfig(),
      api.getReviewsCacheStatus(),
    ]);
    setApiConfig(config);
    setReviewsCache(status);
  }, []);

  useEffect(() => {
    void loadStatus().catch((error) => {
      setPageError(error instanceof Error ? error.message : 'Ошибка загрузки');
    });
  }, [loadStatus]);

  const handleCheckWb = async () => {
    if (!wbArticle.trim()) return;
    setWbLoading(true);
    setWbError(null);
    try {
      const result = await api.lookupReviewRating('wb', wbArticle.trim());
      setWbResult(result);
      await loadStatus();
    } catch (error) {
      setWbError(error instanceof Error ? error.message : 'Ошибка проверки WB');
      setWbResult(null);
    } finally {
      setWbLoading(false);
    }
  };

  const handleCheckOzon = async () => {
    if (!ozonArticle.trim()) return;
    setOzonLoading(true);
    setOzonError(null);
    try {
      const result = await api.lookupReviewRating('ozon', ozonArticle.trim());
      setOzonResult(result);
      await loadStatus();
    } catch (error) {
      setOzonError(error instanceof Error ? error.message : 'Ошибка проверки Ozon');
      setOzonResult(null);
    } finally {
      setOzonLoading(false);
    }
  };

  const ozonNeedsOfferResolver =
    ozonArticle.trim().length > 0 && !/^\d+$/.test(ozonArticle.trim());

  return (
    <div className="page reviews-page">
      <header className="page-header">
        <h1>Отзывы</h1>
      </header>

      {pageError && <p className="error-banner">{pageError}</p>}

      <CollapsibleSection
        title="Средний рейтинг по артикулу"
        summary="WB — Seller API, Ozon — MPSTATS"
        defaultOpen
      >
        <p className="section-hint">
          Введите артикул маркетплейса. Для WB нужен кэш товаров и токен с категорией «Отзывы и
          вопросы» (Настройки). Для Ozon — MPSTATS и ключи Ozon Seller API при вводе offer_id.
        </p>

        <div className="reviews-sync-grid">
          <div className="reviews-sync-block">
            <h3 className="reviews-sync-title">WB</h3>
            <p className="reviews-sync-meta">
              {reviewsCache?.wb.reviewCount
                ? `${reviewsCache.wb.reviewCount} отзывов в кэше · ${formatCacheDate(reviewsCache.wb.updatedAt)}`
                : 'Проверка по артикулу через WB API'}
            </p>
          </div>

          <div className="reviews-sync-block">
            <h3 className="reviews-sync-title">Ozon</h3>
            <p className="reviews-sync-meta">
              {apiConfig?.mpstats.apiTokenConfigured
                ? 'Данные запрашиваются через MPSTATS при проверке'
                : 'Настройте MPSTATS_TOKEN в разделе «Настройки»'}
            </p>
            {ozonNeedsOfferResolver && !apiConfig?.ozon.clientIdConfigured && (
              <p className="reviews-result-error">
                Для offer_id также нужны OZON_CLIENT_ID и OZON_API_KEY
              </p>
            )}
          </div>
        </div>

        <div className="reviews-check-grid">
          <div className="reviews-check-block">
            <div className="field">
              <label htmlFor="wb-review-article">Артикул маркетплейса (WB)</label>
              <input
                id="wb-review-article"
                className="clay-input"
                value={wbArticle}
                onChange={(e) => setWbArticle(e.target.value)}
                placeholder="LT-240105-PST-1-1x1orange"
              />
            </div>
            <button
              type="button"
              className="clay-btn"
              disabled={wbLoading || !wbArticle.trim() || !apiConfig?.wb.apiTokenConfigured}
              onClick={() => void handleCheckWb()}
            >
              {wbLoading ? 'Проверка...' : 'Проверить WB'}
            </button>
            <RatingResult label="WB" result={wbResult} loading={wbLoading} error={wbError} />
          </div>

          <div className="reviews-check-block">
            <div className="field">
              <label htmlFor="ozon-review-article">Артикул маркетплейса (Ozon)</label>
              <input
                id="ozon-review-article"
                className="clay-input"
                value={ozonArticle}
                onChange={(e) => setOzonArticle(e.target.value)}
                placeholder="LT-240105-PST-1-1x1orange"
              />
            </div>
            <button
              type="button"
              className="clay-btn"
              disabled={
                ozonLoading ||
                !ozonArticle.trim() ||
                !apiConfig?.mpstats.apiTokenConfigured ||
                (ozonNeedsOfferResolver &&
                  (!apiConfig?.ozon.clientIdConfigured || !apiConfig?.ozon.apiKeyConfigured))
              }
              onClick={() => void handleCheckOzon()}
            >
              {ozonLoading ? 'Проверка...' : 'Проверить Ozon'}
            </button>
            <RatingResult label="Ozon" result={ozonResult} loading={ozonLoading} error={ozonError} />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
