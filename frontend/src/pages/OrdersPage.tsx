import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { OrderSupplierGroup } from '../components/OrderSupplierGroup';
import type { FabricSaleType, OrdersFetchResponse } from '../types';
import {
  FABRIC_SUPPLIER_FILTERS,
  resolveFilteredOrdersView,
} from '../utils/orderSupplierFilters';
import {
  readStoredWarehouseStockEnabled,
  WAREHOUSE_STOCK_ENABLED_CHANGE_EVENT,
} from '../utils/warehouseStockDisplay';

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
  const [warehouseStockEnabled, setWarehouseStockEnabled] = useState(readStoredWarehouseStockEnabled);
  const [ordersData, setOrdersData] = useState<OrdersFetchResponse | null>(null);
  const [fabricTypeFilter, setFabricTypeFilter] = useState<FabricSaleType | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncEnabled = () => setWarehouseStockEnabled(readStoredWarehouseStockEnabled());

    window.addEventListener(WAREHOUSE_STOCK_ENABLED_CHANGE_EVENT, syncEnabled);
    window.addEventListener('storage', syncEnabled);

    return () => {
      window.removeEventListener(WAREHOUSE_STOCK_ENABLED_CHANGE_EVENT, syncEnabled);
      window.removeEventListener('storage', syncEnabled);
    };
  }, []);

  const handleFetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.fetchOrders();
      setFabricTypeFilter(null);
      setSupplierFilter(null);
      setOrdersData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка получения заказов');
    } finally {
      setLoading(false);
    }
  };

  const toggleFabricTypeFilter = (type: FabricSaleType) => {
    setFabricTypeFilter((current) => (current === type ? null : type));
  };

  const toggleSupplierFilter = (key: string) => {
    setSupplierFilter((current) => (current === key ? null : key));
  };

  const filteredView = ordersData
    ? resolveFilteredOrdersView(ordersData.groups, supplierFilter, fabricTypeFilter)
    : null;

  return (
    <div>
      <h1 className="page-title">Обработка заказов</h1>

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
            <>
              <div className="orders-filter-rows">
                <div
                  className="orders-fabric-type-filters orders-catalog-filters"
                  role="group"
                  aria-label="Фильтр по типу ткани"
                >
                  <button
                    type="button"
                    className={`clay-btn clay-btn-secondary${
                      fabricTypeFilter === 'cut' ? ' is-active' : ''
                    }`}
                    aria-pressed={fabricTypeFilter === 'cut'}
                    onClick={() => toggleFabricTypeFilter('cut')}
                  >
                    Все отрезы
                  </button>
                  <button
                    type="button"
                    className={`clay-btn clay-btn-secondary${
                      fabricTypeFilter === 'roll' ? ' is-active' : ''
                    }`}
                    aria-pressed={fabricTypeFilter === 'roll'}
                    onClick={() => toggleFabricTypeFilter('roll')}
                  >
                    Все рулоны
                  </button>
                </div>

                <div
                  className="orders-supplier-filters orders-catalog-filters"
                  role="group"
                  aria-label="Фильтр по поставщику"
                >
                  {FABRIC_SUPPLIER_FILTERS.map((supplier) => (
                    <button
                      type="button"
                      key={supplier.key}
                      className={`clay-btn clay-btn-secondary${
                        supplierFilter === supplier.key ? ' is-active' : ''
                      }`}
                      aria-pressed={supplierFilter === supplier.key}
                      onClick={() => toggleSupplierFilter(supplier.key)}
                    >
                      {supplier.title}
                    </button>
                  ))}
                </div>
              </div>

              {filteredView?.kind === 'all' &&
                ordersData.groups.map((group) => (
                  <OrderSupplierGroup
                    key={group.key}
                    group={group}
                    warehouseStockEnabled={warehouseStockEnabled}
                  />
                ))}

              {filteredView?.kind === 'group' && (
                <OrderSupplierGroup
                  key={filteredView.group.key}
                  group={filteredView.group}
                  warehouseStockEnabled={warehouseStockEnabled}
                />
              )}

              {filteredView?.kind === 'empty' && (
                <section className="section clay-card">
                  <p className="empty-state">{filteredView.message}</p>
                </section>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
