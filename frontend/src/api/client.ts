import type { AppConfig, GenerateResponse, MarketplaceApiPublicConfig, OrdersFetchResponse, WbTitlesCacheStatus } from '../types';

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

  syncWbTitlesCache: () =>
    request<WbTitlesCacheStatus>('/api/marketplace/wb-titles/sync', {
      method: 'POST',
    }),
};

export function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
