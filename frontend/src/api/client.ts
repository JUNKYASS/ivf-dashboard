import type {
  AppConfig,
  GenerateResponse,
  MarketplaceApiPublicConfig,
  OrdersFetchResponse,
  OzonProductCacheStatus,
  ReviewRatingLookupResult,
  ReviewsCacheStatus,
  WarehouseStockStatus,
  WarehouseStockUploadResponse,
  WbTitlesCacheStatus,
} from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getConfig: () => request<AppConfig>('/api/config'),

  uploadMapping: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<AppConfig>('/api/config/mapping', { method: 'POST', body: form });
  },

  saveTexdesignUrl: (url: string) =>
    request<AppConfig>('/api/config/texdesign-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

  saveTexdesignEnabled: (enabled: boolean) =>
    request<AppConfig>('/api/config/texdesign-enabled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }),

  saveThreshold: (key: string, threshold: number, remain: number) =>
    request<AppConfig>('/api/config/thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, threshold, remain }),
    }),

  generate: (formData: FormData) =>
    request<GenerateResponse>('/api/generate', { method: 'POST', body: formData }),

  downloadUrl: (type: 'ozon' | 'wb') => `/api/download/${type}`,

  getMarketplaceApiConfig: () => request<MarketplaceApiPublicConfig>('/api/config/marketplace-api'),

  saveMarketplaceApiConfig: (payload: {
    ozonClientId?: string;
    ozonApiKey?: string;
    wbApiToken?: string;
    mpstatsToken?: string;
  }) =>
    request<MarketplaceApiPublicConfig>('/api/config/marketplace-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  fetchOrders: () =>
    request<OrdersFetchResponse>('/api/marketplace/orders/fetch', {
      method: 'POST',
    }),

  getWarehouseStockStatus: () =>
    request<WarehouseStockStatus>('/api/marketplace/warehouse-stock'),

  uploadWarehouseStock: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<WarehouseStockUploadResponse>('/api/marketplace/warehouse-stock', {
      method: 'POST',
      body: form,
    });
  },

  syncWbTitlesCache: () =>
    request<WbTitlesCacheStatus>('/api/marketplace/wb-titles/sync', {
      method: 'POST',
    }),

  syncOzonProductCache: () =>
    request<OzonProductCacheStatus>('/api/marketplace/ozon-products/sync', {
      method: 'POST',
    }),

  getReviewsCacheStatus: () => request<ReviewsCacheStatus>('/api/marketplace/reviews/status'),

  syncWbReviewsCache: () =>
    request<ReviewsCacheStatus['wb']>('/api/marketplace/reviews/wb/sync', {
      method: 'POST',
    }),

  lookupReviewRating: (marketplace: 'wb' | 'ozon', article: string) => {
    const params = new URLSearchParams({ marketplace, article });
    return request<ReviewRatingLookupResult>(`/api/marketplace/reviews/rating?${params.toString()}`);
  },

  generateStickers: async (
    marketplace: 'ozon' | 'wb',
    options: { scope?: 'all' | 'unprinted' } = {},
  ) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 180_000);
    const scope = options.scope ?? 'all';
    const query = scope === 'unprinted' ? '?scope=unprinted' : '';

    try {
      const response = await fetch(`/api/marketplace/stickers/${marketplace}${query}`, {
        method: 'POST',
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const count = Number(response.headers.get('X-Stickers-Count') ?? '0');
      const skippedRaw = response.headers.get('X-Stickers-Skipped') ?? '';
      const skipped = skippedRaw ? skippedRaw.split(',').filter(Boolean) : [];
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl, buildStickersFilename(marketplace, scope));
      URL.revokeObjectURL(objectUrl);
      return { count, skipped };
    } finally {
      window.clearTimeout(timer);
    }
  },
};

export function buildStickersFilename(
  marketplace: 'ozon' | 'wb',
  scope: 'all' | 'unprinted' = 'all',
): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const scopePart = scope === 'unprinted' ? '-unprinted' : '';
  return `${marketplace}-labels${scopePart}-${stamp}.pdf`;
}

export function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
