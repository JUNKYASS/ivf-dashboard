import axios from 'axios';
import { OZON_API_BASE_URL } from '../constants';
import {
  appendPdfSource,
  createLabelsDocument,
  formatArticleCaption,
} from './labelPdfService';
import {
  OZON_LABEL_BATCH_SIZE,
  STICKERS_TIMEOUT_MS,
  StickersError,
  axiosErrorMessage,
  chunk,
  isRetryableLabelError,
  messageFromResponseData,
  sleep,
} from './stickersShared';

type OzonProduct = {
  offer_id?: string;
  quantity?: number;
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

type OzonPostingLabel = {
  postingNumber: string;
  caption: string;
};

export async function generateOzonStickers(
  clientId: string,
  apiKey: string,
): Promise<{ pdfBytes: Uint8Array; count: number; skipped: string[] }> {
  const postings = await listAwaitingDeliverPostings(clientId, apiKey);
  if (postings.length === 0) {
    throw new StickersError('Нет отправлений Ozon в статусе «Готово к отгрузке»');
  }

  const { doc, font } = await createLabelsDocument();
  const skipped: string[] = [];

  for (const batch of chunk(postings, OZON_LABEL_BATCH_SIZE)) {
    try {
      const pdfBytes = await fetchPackageLabelPdfWithRetry(
        clientId,
        apiKey,
        batch.map((item) => item.postingNumber),
      );
      await appendPdfSource(
        doc,
        font,
        pdfBytes,
        batch.map((item) => item.caption),
      );
    } catch (error) {
      console.error('Ozon package-label batch failed, retrying singles:', axiosErrorMessage(error));
      for (const posting of batch) {
        try {
          const pdfBytes = await fetchPackageLabelPdfWithRetry(clientId, apiKey, [
            posting.postingNumber,
          ]);
          await appendPdfSource(doc, font, pdfBytes, [posting.caption]);
        } catch (singleError) {
          console.error(
            `Ozon label skipped ${posting.postingNumber}:`,
            axiosErrorMessage(singleError),
          );
          skipped.push(posting.postingNumber);
        }
      }
    }
  }

  if (doc.getPageCount() === 0) {
    throw new StickersError('Не удалось получить этикетки Ozon');
  }

  return {
    pdfBytes: await doc.save(),
    count: doc.getPageCount(),
    skipped,
  };
}

async function listAwaitingDeliverPostings(
  clientId: string,
  apiKey: string,
): Promise<OzonPostingLabel[]> {
  const lines: OzonPostingLabel[] = [];
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
          status: 'awaiting_deliver',
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
        headers: ozonHeaders(clientId, apiKey),
        timeout: STICKERS_TIMEOUT_MS,
      },
    );

    const result = response.data?.result;
    const postings = result?.postings ?? response.data?.postings ?? [];

    for (const posting of postings) {
      const postingNumber = posting.posting_number?.trim();
      if (!postingNumber) continue;

      const items = (posting.products ?? [])
        .map((product) => ({
          article: product.offer_id?.trim() ?? '',
          quantity: product.quantity && product.quantity > 0 ? product.quantity : 1,
        }))
        .filter((item) => item.article);

      if (items.length === 0) continue;

      lines.push({
        postingNumber,
        caption: formatArticleCaption(items),
      });
    }

    const hasNext = result?.has_next ?? postings.length >= limit;
    if (!hasNext || postings.length === 0) break;

    offset += limit;
    if (offset > 20_000) break;
  }

  return lines;
}

async function fetchPackageLabelPdfWithRetry(
  clientId: string,
  apiKey: string,
  postingNumbers: string[],
): Promise<Uint8Array> {
  let lastMessage = '';

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetchPackageLabelPdf(clientId, apiKey, postingNumbers);
    } catch (error) {
      lastMessage = axiosErrorMessage(error);
      if (attempt < 3 && isRetryableLabelError(lastMessage)) {
        await sleep(5000);
        continue;
      }
      throw error;
    }
  }

  throw new Error(lastMessage || 'Ozon package-label failed');
}

async function fetchPackageLabelPdf(
  clientId: string,
  apiKey: string,
  postingNumbers: string[],
): Promise<Uint8Array> {
  const response = await axios.post(
    `${OZON_API_BASE_URL}/v2/posting/fbs/package-label`,
    { posting_number: postingNumbers },
    {
      headers: ozonHeaders(clientId, apiKey),
      timeout: STICKERS_TIMEOUT_MS,
      responseType: 'arraybuffer',
      validateStatus: () => true,
    },
  );

  const bytes = new Uint8Array(response.data as ArrayBuffer);
  const contentType = String(response.headers['content-type'] ?? '');

  if (response.status >= 400 || contentType.includes('application/json')) {
    throw new Error(messageFromResponseData(bytes) ?? `Ozon HTTP ${response.status}`);
  }

  if (bytes.length >= 2 && bytes[0] === 0x25 && bytes[1] === 0x50) {
    return bytes;
  }

  try {
    const json = JSON.parse(Buffer.from(bytes).toString('utf8')) as { content?: string };
    if (json.content) {
      return new Uint8Array(Buffer.from(json.content, 'base64'));
    }
  } catch {
    // fall through
  }

  throw new Error('Ozon не вернул PDF этикетки');
}

function ozonHeaders(clientId: string, apiKey: string): Record<string, string> {
  return {
    'Client-Id': clientId,
    'Api-Key': apiKey,
    'Content-Type': 'application/json',
  };
}
