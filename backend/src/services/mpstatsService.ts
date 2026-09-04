import axios, { isAxiosError } from 'axios';
import { MPSTATS_API_BASE_URL } from '../constants';

export type MpstatsOzonComment = {
  sku?: number;
  date?: string;
  valuation?: number;
  rating?: number;
  text?: string;
  answer?: string;
};

export type MpstatsReviewAggregate = {
  count: number;
  sumRating: number;
  avgRating: number;
};

function roundRating(value: number): number {
  return Math.round(value * 100) / 100;
}

export function extractCommentRating(comment: MpstatsOzonComment): number | null {
  const value = comment.valuation ?? comment.rating;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 1 || value > 5) return null;
  return value;
}

export function aggregateMpstatsComments(comments: MpstatsOzonComment[]): MpstatsReviewAggregate {
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

  return `MPSTATS: ${message}`;
}

export async function fetchMpstatsOzonComments(
  sku: number,
  token: string,
): Promise<MpstatsOzonComment[]> {
  try {
    const response = await axios.get<MpstatsOzonComment[]>(
      `${MPSTATS_API_BASE_URL}/oz/items/${sku}/comments`,
      {
        headers: {
          'X-Mpstats-TOKEN': token,
          'Content-Type': 'application/json',
        },
        timeout: 60_000,
      },
    );

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw new Error(formatMpstatsError(error));
  }
}
