import axios from 'axios';
import { OZON_API_BASE_URL } from '../constants';
import type { RawOrderLine } from '../types';
import { lookupOzonProductImage } from './ozonProductCacheService';

type OzonProduct = {
  offer_id?: string;
  quantity?: number;
  product_name?: string;
  name?: string;
};

type OzonPosting = {
  posting_number?: string;
  products?: OzonProduct[];
};

type OzonListResponse = {
  result?: {
    postings?: OzonPosting[];
    has_next?: boolean;
  };
  postings?: OzonPosting[];
};

export async function fetchOzonOrders(clientId: string, apiKey: string): Promise<RawOrderLine[]> {
  const lines: RawOrderLine[] = [];
  let offset = 0;
  const limit = 1000;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const to = new Date();

  while (true) {
    const response = await axios.post<OzonListResponse>(
      `${OZON_API_BASE_URL}/v3/posting/fbs/list`,
      {
        dir: 'ASC',
        filter: {
          status: 'awaiting_packaging',
          since: since.toISOString(),
          to: to.toISOString(),
        },
        limit,
        offset,
        with: {
          analytics_data: false,
          barcodes: false,
          financial_data: false,
        },
      },
      {
        headers: {
          'Client-Id': clientId,
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 60_000,
      },
    );

    const result = response.data?.result;
    const postings = result?.postings ?? response.data?.postings ?? [];

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
          imageUrl: lookupOzonProductImage(offerId),
          quantity: product.quantity && product.quantity > 0 ? product.quantity : 1,
        });
      }
    }

    const hasNext = result?.has_next ?? postings.length >= limit;
    if (!hasNext || postings.length === 0) break;

    offset += limit;
    if (offset > 20_000) break;
  }

  return lines;
}
