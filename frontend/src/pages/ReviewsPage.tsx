import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { CollapsibleSection } from '../components/CollapsibleSection';
import type {
  MarketplaceApiPublicConfig,
  ReviewGroupMemberRating,
  ReviewRatingLookupResult,
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

  const hasGroup = Boolean(result.groupMembers && result.groupMembers.length > 0);

  if (result.count === 0 && !hasGroup) {
    return (
      <p className="reviews-result-message">
        {label}: отзывов не найдено (источник: {formatSource(result.source)})
      </p>
    );
  }

  return (
    <div className="reviews-result-card">
      {result.count > 0 ? (
        <>
          <p className="reviews-result-rating">{formatRating(result.avgRating)}</p>
          <p className="reviews-result-meta">
            {result.count} отзывов · {formatSource(result.source)}
            {result.stale ? ' (устаревшие данные)' : ''} · {formatCacheDate(result.syncedAt)}
          </p>
        </>
      ) : (
        <p className="reviews-result-message">
          {label}: отзывов не найдено (источник: {formatSource(result.source)})
        </p>
      )}
      {result.groupError && (
        <p className="reviews-result-warning">{result.groupError}</p>
      )}
      {hasGroup && <GroupRatingsList members={result.groupMembers!} />}
    </div>
  );
}

function GroupRatingsList({ members }: { members: ReviewGroupMemberRating[] }) {
  return (
    <div className="reviews-group-block">
      <p className="reviews-group-title">Объединенные артикулы</p>
      <ul className="reviews-group-list">
        {members.map((member) => (
          <li
            key={`${member.resolvedKey}:${member.article}`}
            className={`reviews-group-item${member.isRequested ? ' is-requested' : ''}`}
          >
            <span className="reviews-group-article">{member.article}</span>
            <span className="reviews-group-rating">
              {member.count > 0 ? formatRating(member.avgRating) : '—'}
            </span>
            <span className="reviews-group-count">
              {member.count > 0 ? `${member.count} отз.` : 'нет отзывов'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewsPage() {
  const [apiConfig, setApiConfig] = useState<MarketplaceApiPublicConfig | null>(null);
  const [wbArticle, setWbArticle] = useState('');
  const [ozonArticle, setOzonArticle] = useState('');
  const [wbResult, setWbResult] = useState<ReviewRatingLookupResult | null>(null);
  const [ozonResult, setOzonResult] = useState<ReviewRatingLookupResult | null>(null);
  const [wbLoading, setWbLoading] = useState(false);
  const [ozonLoading, setOzonLoading] = useState(false);
  const [wbError, setWbError] = useState<string | null>(null);
  const [ozonError, setOzonError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const config = await api.getMarketplaceApiConfig();
    setApiConfig(config);
  }, []);

  useEffect(() => {
    void loadConfig().catch((error) => {
      setPageError(error instanceof Error ? error.message : 'Ошибка загрузки');
    });
  }, [loadConfig]);

  const handleCheckWb = async () => {
    if (!wbArticle.trim()) return;
    setWbLoading(true);
    setWbError(null);
    try {
      const result = await api.lookupReviewRating('wb', wbArticle.trim());
      setWbResult(result);
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
        summary="WB и Ozon — MPSTATS"
        defaultOpen
      >
        <p className="stickers-hint">
          Введите артикул товара на маркетплейсе чтобы увидеть его средний рейтинг (без привязки к
          группе). Ниже также показываются рейтинги артикулов из той же объединённой карточки (в подсчете участвуют только отзывы с текстом). Данные
          MPSTATS.
        </p>

        <div className="reviews-sync-grid">
          <div className="reviews-sync-block">
            <h3 className="reviews-sync-title">WB</h3>
          </div>

          <div className="reviews-sync-block">
            <h3 className="reviews-sync-title">Ozon</h3>
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
              <input
                id="wb-review-article"
                className="clay-input"
                aria-label="Артикул маркетплейса WB"
                value={wbArticle}
                onChange={(e) => setWbArticle(e.target.value)}
                placeholder="Арт. маркетплейса"
              />
            </div>
            <button
              type="button"
              className="clay-btn"
              disabled={wbLoading || !wbArticle.trim() || !apiConfig?.mpstats.apiTokenConfigured}
              onClick={() => void handleCheckWb()}
            >
              {wbLoading ? 'Проверка...' : 'Проверить WB'}
            </button>
            <RatingResult label="WB" result={wbResult} loading={wbLoading} error={wbError} />
          </div>

          <div className="reviews-check-block">
            <div className="field">
              <input
                id="ozon-review-article"
                className="clay-input"
                aria-label="Артикул маркетплейса Ozon"
                value={ozonArticle}
                onChange={(e) => setOzonArticle(e.target.value)}
                placeholder="Арт. маркетплейса"
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
