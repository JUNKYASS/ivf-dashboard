import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import { OZON_API_BASE_URL } from '../constants';
import { ozonPost, ozonRequestHeaders } from './ozonHttpClient';
import { STICKERS_TIMEOUT_MS, sleep } from './stickersShared';

const LABEL_POLL_MS = 2000;

type OzonLabelCreateResponse = {
  tasks?: Array<{ task_id?: number; task_type?: string }>;
};

type OzonLabelGetResponse = {
  error?: { code?: string; message?: string } | null;
  file_url?: string;
  status?: {
    code?: string;
    unprinted_postings?: Array<{ posting_number?: string; message?: string }>;
  };
};

async function downloadPdfByUrl(fileUrl: string): Promise<Uint8Array> {
  const response = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    timeout: STICKERS_TIMEOUT_MS,
    validateStatus: () => true,
  });

  if (response.status >= 400) {
    throw new Error(`Ozon: не удалось скачать PDF этикетки (HTTP ${response.status})`);
  }

  const bytes = new Uint8Array(response.data as ArrayBuffer);
  if (bytes.length >= 2 && bytes[0] === 0x25 && bytes[1] === 0x50) {
    return bytes;
  }

  throw new Error('Ozon: по ссылке пришёл не PDF');
}

async function pollPackageLabelTask(
  clientId: string,
  apiKey: string,
  taskId: number,
): Promise<Uint8Array> {
  const deadline = Date.now() + STICKERS_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const data = await ozonPost<OzonLabelGetResponse>(
      `${OZON_API_BASE_URL}/v2/posting/fbs/package-label/get`,
      { task_id: taskId },
      ozonRequestHeaders(clientId, apiKey),
      { timeout: STICKERS_TIMEOUT_MS },
    );

    if (data.error?.message?.trim()) {
      throw new Error(`Ozon: ${data.error.message.trim()}`);
    }

    const statusCode = data.status?.code;
    if (statusCode === 'completed') {
      const fileUrl = data.file_url?.trim();
      if (!fileUrl) {
        throw new Error('Ozon: этикетки готовы, но file_url пуст');
      }

      const unprinted = data.status?.unprinted_postings ?? [];
      if (unprinted.length > 0) {
        const details = unprinted
          .map((item) => `${item.posting_number ?? '?'}: ${item.message ?? 'не готово'}`)
          .join('; ');
        throw new Error(`Ozon: не все этикетки готовы (${details})`);
      }

      return downloadPdfByUrl(fileUrl);
    }

    if (statusCode === 'failed' || statusCode === 'error') {
      throw new Error('Ozon: формирование этикеток завершилось с ошибкой');
    }

    await sleep(LABEL_POLL_MS);
  }

  throw new Error('Ozon: таймаут ожидания этикеток');
}

async function mergePdfDocuments(parts: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  for (const part of parts) {
    const source = await PDFDocument.load(part);
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  }

  return merged.save();
}

export async function fetchOzonPackageLabelPdf(
  clientId: string,
  apiKey: string,
  postingNumbers: string[],
): Promise<Uint8Array> {
  const normalized = postingNumbers.map((value) => value.trim()).filter(Boolean);
  if (normalized.length === 0) {
    throw new Error('Ozon: пустой список posting_number');
  }

  const createData = await ozonPost<OzonLabelCreateResponse>(
    `${OZON_API_BASE_URL}/v3/posting/fbs/package-label/create`,
    { posting_numbers: normalized },
    ozonRequestHeaders(clientId, apiKey),
    { timeout: STICKERS_TIMEOUT_MS },
  );

  const taskIds = (createData.tasks ?? [])
    .map((task) => task.task_id)
    .filter((taskId): taskId is number => typeof taskId === 'number' && taskId > 0);

  if (taskIds.length === 0) {
    throw new Error('Ozon не вернул task_id для этикеток');
  }

  const pdfParts: Uint8Array[] = [];
  for (const taskId of taskIds) {
    pdfParts.push(await pollPackageLabelTask(clientId, apiKey, taskId));
  }

  if (pdfParts.length === 1) {
    return pdfParts[0]!;
  }

  return mergePdfDocuments(pdfParts);
}
