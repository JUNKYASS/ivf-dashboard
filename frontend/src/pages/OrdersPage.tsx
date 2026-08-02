import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { MarketplaceApiBlock } from '../components/MarketplaceApiBlock';
import { OrderSupplierGroup } from '../components/OrderSupplierGroup';
import type { MarketplaceApiPublicConfig, OrdersFetchResponse } from '../types';

function MarketplaceStatusLine({
  label,
  status,
}: {
  label: string;
  status: OrdersFetchResponse['marketplaceStatus']['ozon'];
}) {
  if (status.status === 'success') {
    return (
      <p className="marketplace-status marketplace-status-success">
        {label}: {status.message ?? `получено ${status.positionCount ?? 0} поз.`}
      </p>
    );
  }

  return (
    <p className="marketplace-status marketplace-status-error">
      {label}: ошибка — {status.message ?? 'неизвестная ошибка'}
    </p>
  );
}

export function OrdersPage() {
  const [apiConfig, setApiConfig] = useState<MarketplaceApiPublicConfig | null>(null);
  const [ordersData, setOrdersData] = useState<OrdersFetchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApiConfig = useCallback(async () => {
    const data = await api.getMarketplaceApiConfig();
    setApiConfig(data);
  }, []);

  useEffect(() => {
    void loadApiConfig().catch((err: Error) => setError(err.message));
  }, [loadApiConfig]);

  const handleFetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.fetchOrders();
      setOrdersData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка получения заказов');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Обработка заказов</h1>

      <MarketplaceApiBlock config={apiConfig} onConfigChange={setApiConfig} />

      <section className="section clay-card orders-actions">
        <button type="button" className="clay-btn" disabled={loading} onClick={() => void handleFetchOrders()}>
          {loading ? 'Загрузка...' : 'Получить заказы'}
        </button>
      </section>

      {error && <p className="error-banner">{error}</p>}

      {ordersData && (
        <section className="section">
          <div className="marketplace-status-list">
            <MarketplaceStatusLine label="Ozon" status={ordersData.marketplaceStatus.ozon} />
            <MarketplaceStatusLine label="WB" status={ordersData.marketplaceStatus.wb} />
          </div>

          {ordersData.groups.length === 0 ? (
            <section className="section clay-card">
              <p className="empty-state">Нет заказов для отображения</p>
            </section>
          ) : (
            ordersData.groups.map((group) => <OrderSupplierGroup key={group.key} group={group} />)
          )}
        </section>
      )}
    </div>
  );
}
