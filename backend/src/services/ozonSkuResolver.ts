import axios from 'axios';
import { OZON_API_BASE_URL } from '../constants';
import { normalizeArticle } from './mappingLookupService';

type OzonProductInfo = {
  offer_id?: string;
  sku?: number;
  sources?: Array<{ sku?: number }>;
};

type OzonProductInfoListResponse = {
  items?: OzonProductInfo[];
  result?: {
    items?: OzonProductInfo[];
  };
};

export type ResolvedOzonSku = {
  sku: number;
  resolvedKey: string;
  offerId?: string;
};

function pickOzonSku(item: OzonProductInfo): number | null {
  if (typeof item.sku === 'number' && item.sku > 0) {
    return item.sku;
  }

  const fromSources = item.sources?.find((source) => typeof source.sku === 'number' && source.sku > 0);
  return fromSources?.sku ?? null;
}

export function pickOzonSkuFromInfo(item: OzonProductInfo): number | null {
  return pickOzonSku(item);
}

function ozonHeaders(clientId: string, apiKey: string) {
  return {
    'Client-Id': clientId,
    'Api-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

async function fetchSkuByOfferId(
  offerId: string,
  clientId: string,
  apiKey: string,
): Promise<number | null> {
  const response = await axios.post<OzonProductInfoListResponse>(
    `${OZON_API_BASE_URL}/v3/product/info/list`,
    {
      offer_id: [offerId],
      product_id: [],
      sku: [],
    },
    {
      headers: ozonHeaders(clientId, apiKey),
      timeout: 60_000,
    },
  );

  const items = response.data.items ?? response.data.result?.items ?? [];
  const item = items.find((entry) => normalizeArticle(entry.offer_id ?? '') === normalizeArticle(offerId));
  return item ? pickOzonSku(item) : null;
}

export async function resolveOzonSku(
  article: string,
  clientId: string,
  apiKey: string,
): Promise<ResolvedOzonSku | null> {
  const trimmed = article.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return {
      sku: Number(trimmed),
      resolvedKey: `sku:${trimmed}`,
    };
  }

  if (!clientId || !apiKey) {
    throw new Error('Для артикула offer_id нужны OZON_CLIENT_ID и OZON_API_KEY');
  }

  const sku = await fetchSkuByOfferId(trimmed, clientId, apiKey);
  if (sku === null) {
    return null;
  }

  return {
    sku,
    resolvedKey: `offerId:${normalizeArticle(trimmed)}`,
    offerId: trimmed,
  };
}
