import axios from 'axios';
import { WB_API_BASE_URL } from '../constants';
import type { RawOrderLine } from '../types';
import { lookupWbProductImage, lookupWbProductTitle } from './wbTitlesCacheService';

type WbOrder = {
  id?: number;
  article?: string;
  nmId?: number;
};

type WbOrdersResponse = {
  orders?: WbOrder[];
};

export async function fetchWbOrders(apiToken: string): Promise<RawOrderLine[]> {
  const response = await axios.get<WbOrdersResponse>(`${WB_API_BASE_URL}/api/v3/orders/new`, {
    headers: { Authorization: apiToken },
    timeout: 60_000,
  });

  const orders = response.data?.orders ?? [];
  const lines: RawOrderLine[] = [];

  for (const order of orders) {
    const article = order.article?.trim();
    if (!article || order.id === undefined) continue;

    lines.push({
      marketplace: 'wb',
      postingNumber: `WB${order.id}`,
      marketplaceArticle: article,
      productTitle: lookupWbProductTitle(article, order.nmId),
      imageUrl: lookupWbProductImage(article, order.nmId),
      quantity: 1,
    });
  }

  return lines;
}
