import axios from 'axios';
import { WB_API_BASE_URL } from '../constants';
import {
  appendPngSource,
  createLabelsDocument,
  formatArticleCaption,
} from './labelPdfService';
import {
  STICKERS_BATCH_PAUSE_MS,
  STICKERS_TIMEOUT_MS,
  StickersError,
  WB_STATUS_BATCH_SIZE,
  WB_STICKER_BATCH_SIZE,
  axiosErrorMessage,
  chunk,
  sleep,
} from './stickersShared';

type WbOrder = {
  id?: number;
  article?: string;
  supplyId?: string;
};

type WbOrdersResponse = {
  orders?: WbOrder[];
  next?: number | string;
};

type WbOrderStatus = {
  supplierStatus?: string;
  wbStatus?: string;
};

type WbStatusResponse = {
  orders?: Array<{
    id?: number;
    supplierStatus?: string;
    wbStatus?: string;
  }>;
};

type WbOrderLabel = {
  id: number;
  caption: string;
  supplyId: string;
};

export function isWbOrderOnAssembly(
  status: WbOrderStatus | undefined,
  supplyId: string,
): boolean {
  if (!status) return false;
  if (status.supplierStatus !== 'confirm') return false;
  if (status.wbStatus !== 'waiting') return false;
  return supplyId.trim().length > 0;
}

type WbStickersResponse = {
  stickers?: Array<{
    orderId?: number;
    file?: string;
  }>;
};

export async function generateWbStickers(
  apiToken: string,
): Promise<{ pdfBytes: Uint8Array; count: number; skipped: string[] }> {
  try {
    return await generateWbStickersUnsafe(apiToken);
  } catch (error) {
    if (error instanceof StickersError) throw error;
    throw new StickersError(formatWbError(error));
  }
}

async function generateWbStickersUnsafe(
  apiToken: string,
): Promise<{ pdfBytes: Uint8Array; count: number; skipped: string[] }> {
  const orders = await listRecentOrders(apiToken);
  if (orders.length === 0) {
    throw new StickersError('Нет заказов WB за последние 30 дней');
  }

  const statusById = await fetchSupplierStatuses(
    apiToken,
    orders.map((order) => order.id),
  );
  const confirmOrders = orders.filter((order) =>
    isWbOrderOnAssembly(statusById.get(order.id), order.supplyId),
  );
  if (confirmOrders.length === 0) {
    throw new StickersError('Нет заказов WB в статусе «на сборке»');
  }

  const { doc, font } = await createLabelsDocument();
  const skipped: string[] = [];
  let firstBatch = true;

  for (const batch of chunk(confirmOrders, WB_STICKER_BATCH_SIZE)) {
    if (!firstBatch) await sleep(STICKERS_BATCH_PAUSE_MS);
    firstBatch = false;

    try {
      await appendStickerBatch(doc, font, apiToken, batch, skipped);
    } catch (error) {
      console.error('WB stickers batch failed, retrying singles:', axiosErrorMessage(error));
      for (const order of batch) {
        await sleep(STICKERS_BATCH_PAUSE_MS);
        try {
          await appendStickerBatch(doc, font, apiToken, [order], skipped);
        } catch (singleError) {
          console.error(`WB sticker skipped ${order.id}:`, axiosErrorMessage(singleError));
          skipped.push(String(order.id));
        }
      }
    }
  }

  if (doc.getPageCount() === 0) {
    throw new StickersError('Не удалось получить стикеры WB');
  }

  return {
    pdfBytes: await doc.save(),
    count: doc.getPageCount(),
    skipped,
  };
}

async function appendStickerBatch(
  doc: Awaited<ReturnType<typeof createLabelsDocument>>['doc'],
  font: Awaited<ReturnType<typeof createLabelsDocument>>['font'],
  apiToken: string,
  batch: WbOrderLabel[],
  skipped: string[],
): Promise<void> {
  const stickers = await fetchStickers(
    apiToken,
    batch.map((order) => order.id),
  );
  const fileById = new Map<number, string>();
  for (const sticker of stickers) {
    if (sticker.orderId !== undefined && sticker.file) {
      fileById.set(sticker.orderId, sticker.file);
    }
  }

  for (const order of batch) {
    const file = fileById.get(order.id);
    if (!file) {
      skipped.push(String(order.id));
      continue;
    }
    await appendPngSource(doc, font, new Uint8Array(Buffer.from(file, 'base64')), order.caption);
  }
}

async function listRecentOrders(apiToken: string): Promise<WbOrderLabel[]> {
  const orders: WbOrderLabel[] = [];
  const dateFrom = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
  let next: string | number = 0;
  let pageIndex = 0;

  while (pageIndex < 30) {
    if (pageIndex > 0) await sleep(STICKERS_BATCH_PAUSE_MS);

    const response = await axios.get<string>(`${WB_API_BASE_URL}/api/v3/orders`, {
      headers: { Authorization: apiToken },
      params: { limit: 1000, next, dateFrom },
      timeout: STICKERS_TIMEOUT_MS,
      responseType: 'text',
      transformResponse: [(data) => data],
    });

    const parsed = parseWbOrdersPayload(response.data);
    const page = parsed.orders ?? [];
    for (const order of page) {
      const article = order.article?.trim();
      if (!article || order.id === undefined) continue;
      orders.push({
        id: order.id,
        caption: formatArticleCaption([{ article, quantity: 1 }]),
        supplyId: order.supplyId?.trim() ?? '',
      });
    }

    const nextValue = parsed.next;
    if (!nextValue || nextValue === '0' || nextValue === 0 || page.length === 0) break;
    next = nextValue;
    pageIndex += 1;
  }

  return orders;
}

function parseWbOrdersPayload(raw: unknown): WbOrdersResponse {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const patched = text.replace(/"next"\s*:\s*(-?\d+)/, '"next":"$1"');
  return JSON.parse(patched) as WbOrdersResponse;
}

function formatWbError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 429) {
    return 'WB: превышен лимит запросов, подождите минуту и повторите';
  }
  return `WB: ${axiosErrorMessage(error)}`;
}

async function fetchSupplierStatuses(
  apiToken: string,
  orderIds: number[],
): Promise<Map<number, WbOrderStatus>> {
  const statusById = new Map<number, WbOrderStatus>();
  let first = true;

  for (const batch of chunk(orderIds, WB_STATUS_BATCH_SIZE)) {
    if (!first) await sleep(STICKERS_BATCH_PAUSE_MS);
    first = false;

    const response = await axios.post<WbStatusResponse>(
      `${WB_API_BASE_URL}/api/v3/orders/status`,
      { orders: batch },
      {
        headers: { Authorization: apiToken, 'Content-Type': 'application/json' },
        timeout: STICKERS_TIMEOUT_MS,
      },
    );

    for (const order of response.data?.orders ?? []) {
      if (order.id === undefined) continue;
      statusById.set(order.id, {
        supplierStatus: order.supplierStatus,
        wbStatus: order.wbStatus,
      });
    }
  }

  return statusById;
}

async function fetchStickers(
  apiToken: string,
  orderIds: number[],
): Promise<NonNullable<WbStickersResponse['stickers']>> {
  const response = await axios.post<WbStickersResponse>(
    `${WB_API_BASE_URL}/api/v3/orders/stickers`,
    { orders: orderIds },
    {
      params: { type: 'png', width: 58, height: 40 },
      headers: { Authorization: apiToken, 'Content-Type': 'application/json' },
      timeout: STICKERS_TIMEOUT_MS,
    },
  );

  return response.data?.stickers ?? [];
}
