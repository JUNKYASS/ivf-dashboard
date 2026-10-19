import type { RawOrderLine } from '../types';
import { listOzonFbsPostings } from './ozonPostingFbsListService';
import {
  type OzonOrdersCacheMode,
  readFreshOzonOrdersCache,
  readStaleOzonOrdersCache,
  writeOzonOrdersCache,
} from './ozonOrdersCache';

export type OzonOrdersFetchResult = {
  lines: RawOrderLine[];
  mode: OzonOrdersCacheMode;
};

async function fetchOzonOrdersFromApi(clientId: string, apiKey: string): Promise<RawOrderLine[]> {
  const postings = await listOzonFbsPostings(clientId, apiKey, 'awaiting_packaging');
  const lines: RawOrderLine[] = [];

  for (const posting of postings) {
    const postingNumber = posting.posting_number;
    if (!postingNumber) continue;

    for (const product of posting.products ?? []) {
      const offerId = product.offer_id?.trim();
      if (!offerId) continue;

      const productTitle = (product.product_name ?? product.name)?.trim() || null;

      lines.push({
        marketplace: 'ozon',
        postingNumber: `OZN${postingNumber}`,
        marketplaceArticle: offerId,
        productTitle,
        imageUrl: null,
        quantity: product.quantity && product.quantity > 0 ? product.quantity : 1,
      });
    }
  }

  return lines;
}

export async function fetchOzonOrders(
  clientId: string,
  apiKey: string,
): Promise<OzonOrdersFetchResult> {
  const cached = readFreshOzonOrdersCache();
  if (cached) {
    return { lines: cached, mode: 'fresh-cache' };
  }

  try {
    const lines = await fetchOzonOrdersFromApi(clientId, apiKey);
    writeOzonOrdersCache(lines);
    return { lines, mode: 'live' };
  } catch (error) {
    const stale = readStaleOzonOrdersCache();
    if (stale) {
      return { lines: stale, mode: 'stale-cache' };
    }
    throw error;
  }
}

export function formatOzonOrdersStatusMessage(
  lineCount: number,
  mode: OzonOrdersCacheMode,
): string {
  if (mode === 'fresh-cache') {
    return `из кэша (≤2 мин), ${lineCount} поз.`;
  }
  if (mode === 'stale-cache') {
    return `из кэша (API недоступен), ${lineCount} поз.`;
  }
  return `получено ${lineCount} поз.`;
}
