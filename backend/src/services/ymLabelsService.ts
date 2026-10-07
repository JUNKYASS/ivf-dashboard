import axios from 'axios';
import { YM_API_BASE_URL } from '../constants';
import {
  appendYmPdfSource,
  createLabelsDocument,
  formatArticleCaption,
  type CaptionItem,
} from './labelPdfService';
import {
  filterUnprinted,
  pruneMarketplace,
} from './printedLabelsService';
import {
  STICKERS_BATCH_PAUSE_MS,
  STICKERS_TIMEOUT_MS,
  StickersError,
  YM_LABEL_BATCH_SIZE,
  YM_LABEL_FORMAT,
  YM_REPORT_MAX_WAIT_MS,
  YM_REPORT_POLL_MS,
  axiosErrorMessage,
  chunk,
  isRetryableLabelError,
  messageFromResponseData,
  sleep,
  type StickersScope,
} from './stickersShared';
import { sortByProductType } from './stickersSortService';
import { fetchFbsCampaignContext, fetchYmBusinessId, ymHeaders } from './ymApiUtils';

export type YmReportStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'NO_DATA' | string;

export type YmOrderLabel = {
  orderId: number;
  campaignId: number;
  caption: string;
  primaryArticle: string;
  boxCount: number;
};

type YmOrderItem = {
  offerId?: string;
  count?: number;
};

type YmOrder = {
  orderId?: number;
  campaignId?: number;
  items?: YmOrderItem[];
  delivery?: {
    boxesLayout?: unknown[];
  };
};

type YmOrdersResponse = {
  orders?: YmOrder[];
  paging?: { nextPageToken?: string };
};

type YmGenerateReportResponse = {
  status?: string;
  result?: {
    reportId?: string;
    estimatedGenerationTime?: number;
  };
};

type YmReportInfoResponse = {
  status?: string;
  result?: {
    status?: YmReportStatus;
    file?: string;
    estimatedGenerationTime?: number;
  };
};

export type YmStickersResult = {
  pdfBytes: Uint8Array;
  count: number;
  skipped: string[];
  printedIds: string[];
};

export function buildYmOrderCaption(items: YmOrderItem[]): string {
  const captionItems: CaptionItem[] = (items ?? [])
    .map((item) => ({
      article: item.offerId?.trim() ?? '',
      quantity: item.count && item.count > 0 ? item.count : 1,
    }))
    .filter((item) => item.article);

  return formatArticleCaption(captionItems);
}

export function resolveYmBoxCount(order: Pick<YmOrder, 'delivery'>): number {
  const layoutCount = order.delivery?.boxesLayout?.length ?? 0;
  return layoutCount > 0 ? layoutCount : 1;
}

export function expandCaptionsForOrders(orders: YmOrderLabel[]): string[] {
  return orders.flatMap((order) =>
    Array.from({ length: Math.max(order.boxCount, 1) }, () => order.caption),
  );
}

export function isYmReportReady(status: YmReportStatus | undefined): boolean {
  return status === 'DONE';
}

export function isYmReportFailed(status: YmReportStatus | undefined): boolean {
  return status === 'FAILED' || status === 'NO_DATA';
}

export async function generateYmStickers(
  apiToken: string,
  scope: StickersScope = 'all',
): Promise<YmStickersResult> {
  try {
    return await generateYmStickersUnsafe(apiToken, scope);
  } catch (error) {
    if (error instanceof StickersError) throw error;
    throw new StickersError(formatYmError(error));
  }
}

async function generateYmStickersUnsafe(
  apiToken: string,
  scope: StickersScope,
): Promise<YmStickersResult> {
  const allOrders = await listYmFbsStartedOrders(apiToken);
  if (allOrders.length === 0) {
    throw new StickersError('Нет заказов YM в статусе «ожидают сборки»');
  }

  pruneMarketplace(
    'ym',
    allOrders.map((order) => String(order.orderId)),
  );

  let orders = allOrders;
  if (scope === 'unprinted') {
    const unprintedIds = new Set(
      filterUnprinted(
        'ym',
        allOrders.map((order) => String(order.orderId)),
      ),
    );
    orders = allOrders.filter((order) => unprintedIds.has(String(order.orderId)));
    if (orders.length === 0) {
      throw new StickersError('Нет нераспечатанных этикеток YM');
    }
  }

  orders = sortByProductType(orders, (order) => order.primaryArticle);

  const businessId = await fetchYmBusinessId(apiToken);
  const { doc, font } = await createLabelsDocument();
  const skipped: string[] = [];
  const printedIds: string[] = [];
  let firstBatch = true;

  for (const batch of chunk(orders, YM_LABEL_BATCH_SIZE)) {
    if (!firstBatch) await sleep(STICKERS_BATCH_PAUSE_MS);
    firstBatch = false;

    try {
      const pdfBytes = await fetchMassLabelsPdfWithRetry(apiToken, businessId, batch);
      await appendYmPdfSource(doc, font, pdfBytes, expandCaptionsForOrders(batch));
      printedIds.push(...batch.map((order) => String(order.orderId)));
    } catch (error) {
      console.error('YM labels batch failed, retrying singles:', axiosErrorMessage(error));
      for (const order of batch) {
        await sleep(STICKERS_BATCH_PAUSE_MS);
        try {
          const pdfBytes = await fetchSingleOrderLabelPdfWithRetry(
            apiToken,
            order.campaignId,
            order.orderId,
          );
          await appendYmPdfSource(doc, font, pdfBytes, [order.caption]);
          printedIds.push(String(order.orderId));
        } catch (singleError) {
          console.error(`YM label skipped ${order.orderId}:`, axiosErrorMessage(singleError));
          skipped.push(String(order.orderId));
        }
      }
    }
  }

  if (doc.getPageCount() === 0) {
    throw new StickersError('Не удалось получить этикетки YM');
  }

  return {
    pdfBytes: await doc.save(),
    count: doc.getPageCount(),
    skipped,
    printedIds,
  };
}

async function listYmFbsStartedOrders(apiToken: string): Promise<YmOrderLabel[]> {
  const { businessId, campaignIds } = await fetchFbsCampaignContext(apiToken);
  const orders: YmOrderLabel[] = [];
  let pageToken: string | undefined;

  do {
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
        timeout: STICKERS_TIMEOUT_MS,
      },
    );

    const page = response.data ?? {};
    for (const order of page.orders ?? []) {
      const orderId = order.orderId;
      const campaignId = order.campaignId;
      if (orderId === undefined || campaignId === undefined) continue;

      const items = order.items ?? [];
      const primaryArticle = items[0]?.offerId?.trim() ?? '';
      if (!primaryArticle) continue;

      orders.push({
        orderId,
        campaignId,
        caption: buildYmOrderCaption(items),
        primaryArticle,
        boxCount: resolveYmBoxCount(order),
      });
    }

    pageToken = page.paging?.nextPageToken;
  } while (pageToken);

  return orders;
}

async function fetchMassLabelsPdfWithRetry(
  apiToken: string,
  businessId: number,
  orders: YmOrderLabel[],
): Promise<Uint8Array> {
  let lastMessage = '';

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetchMassLabelsPdf(apiToken, businessId, orders);
    } catch (error) {
      lastMessage = axiosErrorMessage(error);
      if (attempt < 3 && isRetryableLabelError(lastMessage)) {
        await sleep(5000);
        continue;
      }
      throw error;
    }
  }

  throw new Error(lastMessage || 'YM mass labels failed');
}

async function fetchSingleOrderLabelPdfWithRetry(
  apiToken: string,
  campaignId: number,
  orderId: number,
): Promise<Uint8Array> {
  let lastMessage = '';

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetchSingleOrderLabelPdf(apiToken, campaignId, orderId);
    } catch (error) {
      lastMessage = axiosErrorMessage(error);
      if (attempt < 3 && isRetryableLabelError(lastMessage)) {
        await sleep(5000);
        continue;
      }
      throw error;
    }
  }

  throw new Error(lastMessage || 'YM single label failed');
}

async function fetchMassLabelsPdf(
  apiToken: string,
  businessId: number,
  orders: YmOrderLabel[],
): Promise<Uint8Array> {
  const response = await axios.post<YmGenerateReportResponse>(
    `${YM_API_BASE_URL}/v2/reports/documents/labels/generate`,
    {
      businessId,
      orderIds: orders.map((order) => order.orderId),
      sortingType: 'SORT_BY_GIVEN_ORDER',
    },
    {
      headers: ymHeaders(apiToken),
      params: { format: YM_LABEL_FORMAT },
      timeout: STICKERS_TIMEOUT_MS,
    },
  );

  const reportId = response.data?.result?.reportId;
  if (!reportId) {
    throw new Error('YM не вернул reportId для этикеток');
  }

  const fileUrl = await pollYmReportFile(apiToken, reportId);
  return downloadPdfFromUrl(fileUrl);
}

async function pollYmReportFile(apiToken: string, reportId: string): Promise<string> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < YM_REPORT_MAX_WAIT_MS) {
    const response = await axios.get<YmReportInfoResponse>(
      `${YM_API_BASE_URL}/v2/reports/info/${encodeURIComponent(reportId)}`,
      {
        headers: ymHeaders(apiToken),
        timeout: STICKERS_TIMEOUT_MS,
      },
    );

    const result = response.data?.result;
    const status = result?.status;

    if (isYmReportReady(status) && result?.file) {
      return result.file;
    }

    if (isYmReportFailed(status)) {
      throw new Error(`YM report ${reportId} failed: ${status ?? 'UNKNOWN'}`);
    }

    const waitMs = Math.max(
      YM_REPORT_POLL_MS,
      (result?.estimatedGenerationTime ?? 0) * 1000 || YM_REPORT_POLL_MS,
    );
    await sleep(Math.min(waitMs, YM_REPORT_POLL_MS * 3));
  }

  throw new Error('YM: превышено время ожидания генерации этикеток');
}

async function fetchSingleOrderLabelPdf(
  apiToken: string,
  campaignId: number,
  orderId: number,
): Promise<Uint8Array> {
  const response = await axios.get(`${YM_API_BASE_URL}/v2/campaigns/${campaignId}/orders/${orderId}/delivery/labels`, {
    headers: ymHeaders(apiToken),
    params: { format: YM_LABEL_FORMAT },
    timeout: STICKERS_TIMEOUT_MS,
    responseType: 'arraybuffer',
    validateStatus: () => true,
  });

  const bytes = new Uint8Array(response.data as ArrayBuffer);
  const contentType = String(response.headers['content-type'] ?? '');

  if (response.status >= 400 || contentType.includes('application/json')) {
    throw new Error(messageFromResponseData(bytes) ?? `YM HTTP ${response.status}`);
  }

  if (bytes.length >= 2 && bytes[0] === 0x25 && bytes[1] === 0x50) {
    return bytes;
  }

  throw new Error('YM не вернул PDF этикетки');
}

async function downloadPdfFromUrl(url: string): Promise<Uint8Array> {
  const response = await axios.get(url, {
    timeout: STICKERS_TIMEOUT_MS,
    responseType: 'arraybuffer',
    validateStatus: () => true,
  });

  const bytes = new Uint8Array(response.data as ArrayBuffer);
  if (response.status >= 400) {
    throw new Error(messageFromResponseData(bytes) ?? `YM download HTTP ${response.status}`);
  }

  if (bytes.length >= 2 && bytes[0] === 0x25 && bytes[1] === 0x50) {
    return bytes;
  }

  throw new Error('YM report download не вернул PDF');
}

function formatYmError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 429) {
    return 'YM: превышен лимит запросов, подождите минуту и повторите';
  }
  return `YM: ${axiosErrorMessage(error)}`;
}
