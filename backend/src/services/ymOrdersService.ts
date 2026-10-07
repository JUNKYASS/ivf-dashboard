import axios from 'axios';
import { YM_API_BASE_URL } from '../constants';
import type { RawOrderLine } from '../types';
import { fetchFbsCampaignContext, ymHeaders } from './ymApiUtils';
import { lookupYmProductImage } from './ymProductCacheService';

type YmOrderItem = {
  offerId?: string;
  offerName?: string;
  count?: number;
};

type YmOrder = {
  orderId?: number;
  items?: YmOrderItem[];
};

type YmOrdersResponse = {
  orders?: YmOrder[];
  paging?: { nextPageToken?: string };
};

async function fetchYmOrderPage(
  apiToken: string,
  businessId: number,
  campaignIds: number[],
  pageToken?: string,
): Promise<YmOrdersResponse> {
  const response = await axios.post<YmOrdersResponse>(
    `${YM_API_BASE_URL}/v1/businesses/${businessId}/orders`,
    {
      statuses: ['PROCESSING'],
      substatuses: ['STARTED'],
      programTypes: ['FBS'],
      campaignIds,
      fake: false,
    },
    {
      headers: ymHeaders(apiToken),
      params: {
        limit: 50,
        ...(pageToken ? { pageToken } : {}),
      },
      timeout: 60_000,
    },
  );

  return response.data ?? {};
}

export async function fetchYmOrders(apiToken: string): Promise<RawOrderLine[]> {
  const { businessId, campaignIds } = await fetchFbsCampaignContext(apiToken);
  const lines: RawOrderLine[] = [];
  let pageToken: string | undefined;

  do {
    const page = await fetchYmOrderPage(apiToken, businessId, campaignIds, pageToken);
    const orders = page.orders ?? [];

    for (const order of orders) {
      const orderId = order.orderId;
      if (orderId === undefined) continue;

      for (const item of order.items ?? []) {
        const offerId = item.offerId?.trim();
        if (!offerId) continue;

        lines.push({
          marketplace: 'ym',
          postingNumber: `YM${orderId}`,
          marketplaceArticle: offerId,
          productTitle: item.offerName?.trim() || null,
          imageUrl: lookupYmProductImage(offerId),
          quantity: item.count && item.count > 0 ? item.count : 1,
        });
      }
    }

    pageToken = page.paging?.nextPageToken;
  } while (pageToken);

  return lines;
}
