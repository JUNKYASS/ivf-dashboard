import axios from 'axios';

export const STICKERS_TIMEOUT_MS = 180_000;
export const STICKERS_BATCH_PAUSE_MS = 250;
export const OZON_LABEL_BATCH_SIZE = 20;
export const WB_STICKER_BATCH_SIZE = 100;
export const WB_STATUS_BATCH_SIZE = 100;

export class StickersError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'StickersError';
    this.status = status;
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function axiosErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const parsed = messageFromResponseData(error.response?.data);
    if (parsed) return parsed;
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export function messageFromResponseData(data: unknown): string | null {
  return parseErrorBody(data);
}

export function isRetryableLabelError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("aren't ready") || lower.includes('not ready') || lower.includes('не готов');
}

function parseErrorBody(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string') {
    return extractMessage(data);
  }
  if (typeof data === 'object' && !ArrayBuffer.isView(data) && !(data instanceof ArrayBuffer)) {
    const record = data as { message?: unknown; error?: unknown };
    if (typeof record.message === 'string') return record.message;
    if (typeof record.error === 'string') return record.error;
  }

  try {
    let text: string | null = null;
    if (Buffer.isBuffer(data)) {
      text = data.toString('utf8');
    } else if (data instanceof ArrayBuffer) {
      text = Buffer.from(data).toString('utf8');
    } else if (ArrayBuffer.isView(data)) {
      text = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
    }
    if (!text) return null;
    return extractMessage(text);
  } catch {
    return null;
  }
}

function extractMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as { message?: unknown; error?: unknown };
      if (typeof json.message === 'string') return json.message;
      if (typeof json.error === 'string') return json.error;
    } catch {
      return trimmed.slice(0, 300);
    }
  }
  return trimmed.slice(0, 300);
}
