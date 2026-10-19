import { OZON_API_BASE_URL, OZON_ORDERS_LOOKBACK_DAYS } from '../constants';
import { ozonPost, ozonRequestHeaders } from './ozonHttpClient';

const V4_PAGE_LIMIT = 100;
const MAX_V4_PAGES = 300;

export type OzonFbsPostingStatus = 'awaiting_packaging' | 'awaiting_deliver';

type OzonListProduct = {
  offer_id?: string;
  quantity?: number;
  product_name?: string;
  name?: string;
};

export type OzonFbsPosting = {
  posting_number?: string;
  status?: string;
  products?: OzonListProduct[];
};

type OzonV4ListResponse = {
  postings?: OzonFbsPosting[];
  has_next?: boolean;
  cursor?: string;
};

function buildDateFilter(lookbackDays: number) {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  return {
    since: since.toISOString(),
    to: new Date().toISOString(),
  };
}

export async function listOzonFbsPostings(
  clientId: string,
  apiKey: string,
  status: OzonFbsPostingStatus,
  lookbackDays = OZON_ORDERS_LOOKBACK_DAYS,
): Promise<OzonFbsPosting[]> {
  const collected: OzonFbsPosting[] = [];
  let cursor = '';

  for (let page = 0; page < MAX_V4_PAGES; page += 1) {
    const body: Record<string, unknown> = {
      filter: {
        ...buildDateFilter(lookbackDays),
        status,
      },
      limit: V4_PAGE_LIMIT,
    };

    if (cursor) {
      body.cursor = cursor;
    }

    const data = await ozonPost<OzonV4ListResponse>(
      `${OZON_API_BASE_URL}/v4/posting/fbs/list`,
      body,
      ozonRequestHeaders(clientId, apiKey),
      { timeout: 60_000 },
    );

    const postings = (data.postings ?? []).filter((posting) => posting.status === status);
    collected.push(...postings);

    if (!data.has_next || !data.cursor) {
      break;
    }
    cursor = data.cursor;
  }

  return collected;
}
