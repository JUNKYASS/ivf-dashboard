import axios, { type AxiosRequestConfig } from 'axios';

const MIN_REQUEST_INTERVAL_MS = 250;
const MAX_RETRIES = 3;
const MAX_TOTAL_429_WAIT_MS = 90_000;

let lastRequestAt = 0;
const circuitOpenUntil = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestPathKey(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
}

function headerValue(headers: Record<string, unknown>, name: string): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (raw === undefined || raw === null) return undefined;
  return Array.isArray(raw) ? String(raw[0]) : String(raw);
}

/** Ozon: Retry-After (сек или HTTP-date), Item-Retry-After (минуты). */
export function parseOzon429DelayMs(headers: Record<string, unknown>): number {
  const itemRetryMin = headerValue(headers, 'item-retry-after');
  if (itemRetryMin) {
    const minutes = Number(itemRetryMin);
    if (!Number.isNaN(minutes) && minutes > 0) {
      return minutes * 60_000;
    }
  }

  const retryAfter = headerValue(headers, 'retry-after');
  if (retryAfter) {
    const asSeconds = Number(retryAfter);
    if (!Number.isNaN(asSeconds) && asSeconds > 0 && asSeconds < 86_400) {
      return asSeconds * 1000;
    }
    const asDate = Date.parse(retryAfter);
    if (!Number.isNaN(asDate)) {
      return Math.max(asDate - Date.now(), 1000);
    }
  }

  for (const key of ['x-ratelimit-retry', 'x-ratelimit-reset']) {
    const raw = headerValue(headers, key);
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isNaN(value) || value <= 0) continue;
    if (value > 10_000) {
      return Math.max(value * 1000 - Date.now(), 1000);
    }
    return value * 1000;
  }

  return 60_000;
}

function isRetryableOzonError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function getBackoffDelayMs(attempt: number, error: unknown): number {
  if (axios.isAxiosError(error) && error.response?.status === 429) {
    return parseOzon429DelayMs(error.response.headers ?? {});
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

function format429Message(delayMs: number): string {
  if (delayMs >= 60_000) {
    const minutes = Math.max(1, Math.ceil(delayMs / 60_000));
    return `превышен лимит API (Ozon просит подождать ~${minutes} мин)`;
  }
  const seconds = Math.max(5, Math.ceil(delayMs / 1000));
  return `превышен лимит API, повторите через ~${seconds} с`;
}

function toOzonError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { code?: number; message?: string } | undefined;
    if (error.response?.status === 429) {
      const delayMs = parseOzon429DelayMs(error.response.headers ?? {});
      const apiMessage = data?.message?.trim();
      if (apiMessage) {
        return new Error(`${apiMessage} (${format429Message(delayMs)})`);
      }
      return new Error(format429Message(delayMs));
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return new Error(data.message.trim());
    }
    return new Error(error.message);
  }
  return error instanceof Error ? error : new Error(String(error));
}

function assertCircuitClosed(pathKey: string): void {
  const until = circuitOpenUntil.get(pathKey);
  if (!until || Date.now() >= until) {
    return;
  }
  const delayMs = until - Date.now();
  throw new Error(format429Message(delayMs));
}

function openCircuit(pathKey: string, delayMs: number): void {
  circuitOpenUntil.set(pathKey, Date.now() + delayMs);
}

export function ozonRequestHeaders(clientId: string, apiKey: string): Record<string, string> {
  return {
    'Client-Id': clientId,
    'Api-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

export async function ozonPost<T>(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  config?: Omit<AxiosRequestConfig, 'method' | 'url' | 'data' | 'headers'>,
): Promise<T> {
  const pathKey = requestPathKey(url);
  assertCircuitClosed(pathKey);

  let lastError: unknown;
  let total429WaitMs = 0;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    await waitForRateLimit();
    lastRequestAt = Date.now();

    try {
      const response = await axios.post<T>(url, body, {
        ...config,
        headers,
      });
      circuitOpenUntil.delete(pathKey);
      return response.data;
    } catch (error) {
      lastError = error;

      if (!isRetryableOzonError(error) || attempt >= MAX_RETRIES - 1) {
        throw toOzonError(error);
      }

      const delayMs = getBackoffDelayMs(attempt, error);

      if (axios.isAxiosError(error) && error.response?.status === 429) {
        openCircuit(pathKey, delayMs);
        if (delayMs > 30_000 || total429WaitMs + delayMs > MAX_TOTAL_429_WAIT_MS) {
          throw new Error(format429Message(delayMs));
        }
        total429WaitMs += delayMs;
      }

      await sleep(delayMs);
    }
  }

  throw toOzonError(lastError);
}
