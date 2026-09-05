import axios, { isAxiosError } from 'axios';
import { MPSTATS_API_BASE_URL } from '../constants';

export type MpstatsComment = {
  sku?: number;
  date?: string;
  valuation?: number;
  rating?: number;
  text?: string;
  answer?: string;
  has_photo?: number;
};

/** @deprecated use MpstatsComment */
export type MpstatsOzonComment = MpstatsComment;

export type MpstatsReviewAggregate = {
  count: number;
  sumRating: number;
  avgRating: number;
};

export type MpstatsItemReviewSummary = {
  count: number;
  avgRating: number | null;
};

type MpstatsItemFullResponse = {
  rating?: number;
  comments?: number;
};

type MpstatsWbCommentsResponse = {
  comments?: MpstatsComment[];
};

function roundRating(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseMpstatsCommentsPayload(data: unknown): MpstatsComment[] {
  if (Array.isArray(data)) {
    return data as MpstatsComment[];
  }

  if (data && typeof data === 'object') {
    const comments = (data as MpstatsWbCommentsResponse).comments;
    if (Array.isArray(comments)) {
      return comments;
    }
  }

  return [];
}

export function extractCommentRating(comment: MpstatsComment): number | null {
  const value = comment.valuation ?? comment.rating;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 1 || value > 5) return null;
  return value;
}

export function aggregateMpstatsComments(comments: MpstatsComment[]): MpstatsReviewAggregate {
  let count = 0;
  let sumRating = 0;

  for (const comment of comments) {
    const rating = extractCommentRating(comment);
    if (rating === null) continue;
    count += 1;
    sumRating += rating;
  }

  return {
    count,
    sumRating,
    avgRating: count > 0 ? roundRating(sumRating / count) : 0,
  };
}

export function parseMpstatsItemFullReview(data: unknown): MpstatsItemReviewSummary {
  if (!data || typeof data !== 'object') {
    return { count: 0, avgRating: null };
  }

  const raw = data as MpstatsItemFullResponse;
  const count = typeof raw.comments === 'number' && raw.comments >= 0 ? raw.comments : 0;
  const ratingValue = typeof raw.rating === 'number' && Number.isFinite(raw.rating) ? raw.rating : null;

  if (count <= 0 || ratingValue === null || ratingValue < 1 || ratingValue > 5) {
    return { count, avgRating: null };
  }

  return {
    count,
    avgRating: roundRating(ratingValue),
  };
}

export type MpstatsReviewSummaryOptions = {
  allowCardFallback?: boolean;
};

function commentsAggregateToSummary(aggregate: MpstatsReviewAggregate): MpstatsItemReviewSummary {
  return {
    count: aggregate.count,
    avgRating: aggregate.count > 0 ? aggregate.avgRating : null,
  };
}

export function pickRicherReviewSummary(
  fromComments: MpstatsItemReviewSummary,
  fromCard: MpstatsItemReviewSummary | null,
): MpstatsItemReviewSummary {
  if (!fromCard) {
    return fromComments;
  }

  if (fromCard.count > fromComments.count) {
    return fromCard;
  }

  return fromComments;
}

const MIN_REQUEST_INTERVAL_MS = 300;
const MAX_RETRIES = 4;

let lastRequestAt = 0;
let requestChain: Promise<unknown> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withMpstatsRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
    }
    lastRequestAt = Date.now();
    return fn();
  };

  const result = requestChain.then(run, run);
  requestChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isRetryableMpstatsError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return true;
  }

  const status = error.response?.status;
  return status === 429 || status === 502 || status === 503 || status === undefined;
}

function getRetryDelayMs(attempt: number, error: unknown): number {
  if (isAxiosError(error) && error.response?.status === 429) {
    const headers = error.response.headers;
    const retrySec = Number(headers['x-ratelimit-retry'] ?? headers['x-ratelimit-reset'] ?? 2);
    return Math.max(retrySec, 1) * 1000;
  }

  return Math.min(1000 * 2 ** attempt, 8000);
}

function formatMpstatsError(error: unknown): string {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Ошибка MPSTATS API';
  }

  const status = error.response?.status;
  const message =
    (error.response?.data as { message?: string } | undefined)?.message ?? error.message;

  if (status === 401) {
    return 'MPSTATS: неверный или отсутствующий токен';
  }
  if (status === 429) {
    return 'MPSTATS: превышен лимит запросов API';
  }
  if (status === 502 || status === 503) {
    return 'MPSTATS временно недоступен. Попробуйте через минуту';
  }
  if (status === 404) {
    return 'MPSTATS: товар не найден в аналитике';
  }

  return `MPSTATS: ${message}`;
}

async function fetchMpstatsItemFullReviewSummary(
  marketplace: 'wb' | 'oz',
  itemId: number,
  token: string,
): Promise<MpstatsItemReviewSummary | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      return await withMpstatsRateLimit(async () => {
        const response = await axios.get<unknown>(
          `${MPSTATS_API_BASE_URL}/${marketplace}/items/${itemId}/full`,
          {
            headers: {
              'X-Mpstats-TOKEN': token,
              'Content-Type': 'application/json',
            },
            timeout: 60_000,
          },
        );

        const summary = parseMpstatsItemFullReview(response.data);
        return summary.count > 0 || summary.avgRating !== null ? summary : null;
      });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      if (isRetryableMpstatsError(error) && attempt < MAX_RETRIES - 1) {
        await sleep(getRetryDelayMs(attempt, error));
        continue;
      }

      return null;
    }
  }

  return null;
}

async function fetchMpstatsComments(
  marketplace: 'wb' | 'oz',
  itemId: number,
  token: string,
): Promise<MpstatsComment[]> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      return await withMpstatsRateLimit(async () => {
        const response = await axios.get<unknown>(
          `${MPSTATS_API_BASE_URL}/${marketplace}/items/${itemId}/comments`,
          {
            headers: {
              'X-Mpstats-TOKEN': token,
              'Content-Type': 'application/json',
            },
            timeout: 60_000,
          },
        );

        return parseMpstatsCommentsPayload(response.data);
      });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return [];
      }

      if (isRetryableMpstatsError(error) && attempt < MAX_RETRIES - 1) {
        await sleep(getRetryDelayMs(attempt, error));
        continue;
      }

      throw new Error(formatMpstatsError(error));
    }
  }

  throw new Error('MPSTATS: не удалось получить данные');
}

export async function fetchMpstatsWbItemReviewSummary(
  nmId: number,
  token: string,
  options: MpstatsReviewSummaryOptions = {},
): Promise<MpstatsItemReviewSummary> {
  const fromComments = commentsAggregateToSummary(
    aggregateMpstatsComments(await fetchMpstatsWbComments(nmId, token)),
  );

  if (!options.allowCardFallback) {
    return fromComments;
  }

  if (fromComments.count > 0) {
    return fromComments;
  }

  const fromCard = await fetchMpstatsItemFullReviewSummary('wb', nmId, token);
  return fromCard ?? fromComments;
}

export async function fetchMpstatsOzonItemReviewSummary(
  sku: number,
  token: string,
): Promise<MpstatsItemReviewSummary> {
  const fromComments = commentsAggregateToSummary(
    aggregateMpstatsComments(await fetchMpstatsOzonComments(sku, token)),
  );
  const fromCard = await fetchMpstatsItemFullReviewSummary('oz', sku, token);
  return pickRicherReviewSummary(fromComments, fromCard);
}

export async function fetchMpstatsWbComments(
  nmId: number,
  token: string,
): Promise<MpstatsComment[]> {
  return fetchMpstatsComments('wb', nmId, token);
}

export async function fetchMpstatsOzonComments(
  sku: number,
  token: string,
): Promise<MpstatsComment[]> {
  return fetchMpstatsComments('oz', sku, token);
}
