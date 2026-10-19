import { listOzonFbsPostings } from './ozonPostingFbsListService';
import { fetchOzonPackageLabelPdf } from './ozonPackageLabelService';
import {
  appendPdfSource,
  createLabelsDocument,
  formatArticleCaption,
} from './labelPdfService';
import {
  filterUnprinted,
  pruneMarketplace,
} from './printedLabelsService';
import {
  OZON_LABEL_BATCH_SIZE,
  StickersError,
  type StickersScope,
  axiosErrorMessage,
  chunk,
  isRetryableLabelError,
  sleep,
} from './stickersShared';
import { sortByProductType } from './stickersSortService';

export type OzonStickersResult = {
  pdfBytes: Uint8Array;
  count: number;
  skipped: string[];
  printedIds: string[];
};

export async function generateOzonStickers(
  clientId: string,
  apiKey: string,
  scope: StickersScope = 'all',
): Promise<OzonStickersResult> {
  const allPostings = await listAwaitingDeliverPostings(clientId, apiKey);
  if (allPostings.length === 0) {
    throw new StickersError('Нет отправлений Ozon в статусе «Готово к отгрузке»');
  }

  pruneMarketplace(
    'ozon',
    allPostings.map((posting) => posting.postingNumber),
  );

  let postings = allPostings;
  if (scope === 'unprinted') {
    const unprintedIds = new Set(
      filterUnprinted(
        'ozon',
        allPostings.map((posting) => posting.postingNumber),
      ),
    );
    postings = allPostings.filter((posting) => unprintedIds.has(posting.postingNumber));
    if (postings.length === 0) {
      throw new StickersError('Нет нераспечатанных этикеток Ozon');
    }
  }

  postings = sortByProductType(postings, (posting) => posting.primaryArticle);

  const { doc, font } = await createLabelsDocument();
  const skipped: string[] = [];
  const printedIds: string[] = [];

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
      printedIds.push(...batch.map((item) => item.postingNumber));
    } catch (error) {
      console.error('Ozon package-label batch failed, retrying singles:', axiosErrorMessage(error));
      for (const posting of batch) {
        try {
          const pdfBytes = await fetchPackageLabelPdfWithRetry(clientId, apiKey, [
            posting.postingNumber,
          ]);
          await appendPdfSource(doc, font, pdfBytes, [posting.caption]);
          printedIds.push(posting.postingNumber);
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
    printedIds,
  };
}

type OzonPostingLabel = {
  postingNumber: string;
  caption: string;
  primaryArticle: string;
};

async function listAwaitingDeliverPostings(
  clientId: string,
  apiKey: string,
): Promise<OzonPostingLabel[]> {
  const postings = await listOzonFbsPostings(clientId, apiKey, 'awaiting_deliver', 30);
  const lines: OzonPostingLabel[] = [];

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
      primaryArticle: items[0]?.article ?? '',
    });
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
      return await fetchOzonPackageLabelPdf(clientId, apiKey, postingNumbers);
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
