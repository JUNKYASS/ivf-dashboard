import type { OrderGroup, OrdersFetchResponse } from '../types';

function normalizeArticle(article: string): string {
  return article.trim().toLowerCase();
}

export function getSupplierOrderQuantity(quantity: number, warehouseStock: number): number {
  return Math.max(0, quantity - warehouseStock);
}

export function applyWarehouseStock(
  ordersData: OrdersFetchResponse,
  stockByArticle: Record<string, number>,
): OrdersFetchResponse {
  const enrichRows = (rows: OrderGroup['rows']) =>
    rows.map((row) => ({
      ...row,
      warehouseStock: stockByArticle[normalizeArticle(row.marketplaceArticle)] ?? 0,
    }));

  return {
    ...ordersData,
    groups: ordersData.groups.map((group) => ({
      ...group,
      rows: enrichRows(group.rows),
    })),
  };
}
