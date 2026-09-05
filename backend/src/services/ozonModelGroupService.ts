import axios from 'axios';
import { OZON_API_BASE_URL } from '../constants';
import { normalizeArticle } from './mappingLookupService';
import { getOzonProductCache } from './ozonProductCacheService';
import { pickOzonSkuFromInfo, resolveOzonSku } from './ozonSkuResolver';

export type OzonGroupMember = {
  offerId: string;
  sku: number;
};

type OzonProductInfo = {
  offer_id?: string;
  sku?: number;
  sources?: Array<{ sku?: number }>;
  model_info?: {
    model_id?: number;
    count?: number;
  };
};

type OzonProductInfoListResponse = {
  items?: OzonProductInfo[];
  result?: {
    items?: OzonProductInfo[];
  };
};

type OzonListItem = {
  offer_id?: string;
};

type OzonProductListResponse = {
  result?: {
    items?: OzonListItem[];
    last_id?: string;
  };
};

const LIST_LIMIT = 1000;
const INFO_BATCH_SIZE = 100;
const MAX_LIST_PAGES = 200;
const MAX_GROUP_SIZE = 40;

function ozonHeaders(clientId: string, apiKey: string) {
  return {
    'Client-Id': clientId,
    'Api-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

async function fetchProductInfoBatch(
  clientId: string,
  apiKey: string,
  offerIds: string[],
): Promise<OzonProductInfo[]> {
  const response = await axios.post<OzonProductInfoListResponse>(
    `${OZON_API_BASE_URL}/v3/product/info/list`,
    {
      offer_id: offerIds,
      product_id: [],
      sku: [],
    },
    {
      headers: ozonHeaders(clientId, apiKey),
      timeout: 60_000,
    },
  );

  return response.data.items ?? response.data.result?.items ?? [];
}

async function fetchProductListPage(
  clientId: string,
  apiKey: string,
  lastId: string,
): Promise<OzonProductListResponse> {
  const response = await axios.post<OzonProductListResponse>(
    `${OZON_API_BASE_URL}/v3/product/list`,
    {
      filter: { visibility: 'ALL' },
      last_id: lastId,
      limit: LIST_LIMIT,
    },
    {
      headers: ozonHeaders(clientId, apiKey),
      timeout: 60_000,
    },
  );

  return response.data;
}

async function listAllSellerOfferIds(clientId: string, apiKey: string): Promise<string[]> {
  const offerIds: string[] = [];
  let lastId = '';

  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const data = await fetchProductListPage(clientId, apiKey, lastId);
    const items = data.result?.items ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      const offerId = item.offer_id?.trim();
      if (offerId) offerIds.push(offerId);
    }

    const nextLastId = data.result?.last_id ?? '';
    if (!nextLastId || nextLastId === lastId || items.length < LIST_LIMIT) break;
    lastId = nextLastId;
  }

  return [...new Set(offerIds)];
}

function membersFromCache(modelId: number): OzonGroupMember[] | null {
  const cache = getOzonProductCache();
  const offerIds = cache.offerIdsByModelId?.[String(modelId)];
  if (!offerIds?.length) return null;

  const members: OzonGroupMember[] = [];
  for (const offerId of offerIds) {
    const sku = cache.skuByOfferId?.[normalizeArticle(offerId)];
    if (!sku) continue;
    members.push({ offerId, sku });
  }

  return members.length > 0 ? members : null;
}

async function membersFromApiScan(
  modelId: number,
  clientId: string,
  apiKey: string,
): Promise<OzonGroupMember[]> {
  const offerIds = await listAllSellerOfferIds(clientId, apiKey);
  const members: OzonGroupMember[] = [];

  for (let index = 0; index < offerIds.length; index += INFO_BATCH_SIZE) {
    const batch = offerIds.slice(index, index + INFO_BATCH_SIZE);
    const infos = await fetchProductInfoBatch(clientId, apiKey, batch);

    for (const info of infos) {
      if (info.model_info?.model_id !== modelId) continue;
      const offerId = info.offer_id?.trim();
      const sku = pickOzonSkuFromInfo(info);
      if (!offerId || !sku) continue;
      members.push({ offerId, sku });
      if (members.length >= MAX_GROUP_SIZE) return members;
    }
  }

  return members;
}

export async function listOzonModelGroupMembers(
  article: string,
  clientId: string,
  apiKey: string,
): Promise<OzonGroupMember[]> {
  const resolved = await resolveOzonSku(article, clientId, apiKey);
  if (!resolved) return [];

  const offerId = resolved.offerId ?? article.trim();
  const cache = getOzonProductCache();
  const cachedModelId = cache.modelIdByOfferId?.[normalizeArticle(offerId)];

  let modelId: number | undefined = cachedModelId;
  let modelCount: number | undefined = cache.offerIdsByModelId?.[String(modelId ?? '')]?.length;

  if (!modelId) {
    const [info] = await fetchProductInfoBatch(clientId, apiKey, [offerId]);
    modelId = info?.model_info?.model_id;
    modelCount = info?.model_info?.count;
  }

  if (!modelId || !modelCount || modelCount <= 1) {
    return [{ offerId, sku: resolved.sku }];
  }

  const fromCache = membersFromCache(modelId);
  if (fromCache && fromCache.length > 1) {
    return fromCache.slice(0, MAX_GROUP_SIZE);
  }

  const fromApi = await membersFromApiScan(modelId, clientId, apiKey);
  if (fromApi.length > 0) {
    return fromApi.slice(0, MAX_GROUP_SIZE);
  }

  return [{ offerId, sku: resolved.sku }];
}
