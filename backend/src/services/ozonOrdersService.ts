import type { RawOrderLine } from '../types';
import { listOzonFbsPostings } from './ozonPostingFbsListService';

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

export async function fetchOzonOrders(clientId: string, apiKey: string): Promise<RawOrderLine[]> {
  return fetchOzonOrdersFromApi(clientId, apiKey);
}
