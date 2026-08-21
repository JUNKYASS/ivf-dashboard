import type { FabricSaleType, OrderGroup, OrderRow } from '../types';

export type FabricSupplierFilter = {
  key: string;
  title: string;
};

/** Mirror of backend SUPPLIER_PREFIX_CONFIG fabric keys (excl. bedding/unmapped). */
export const FABRIC_SUPPLIER_FILTERS: readonly FabricSupplierFilter[] = [
  { key: 'galtex', title: 'Galtex' },
  { key: 'texdesign', title: 'ТексДизайн' },
  { key: 'kumtex', title: 'КумТекс' },
  { key: 'artdesign', title: 'АртДизайн' },
  { key: 'tt', title: 'Традиции Текстиля' },
  { key: 'logatex', title: 'ЛогатексПРО' },
  { key: 'tdl', title: 'ТДЛ' },
  { key: 'chanshu', title: 'Чаншу' },
  { key: 'lakitex', title: 'ЛакиТекс' },
  { key: 'fenix', title: 'Феникс' },
] as const;

export function findGroupByKey(groups: OrderGroup[], key: string): OrderGroup | undefined {
  return groups.find((group) => group.key === key);
}

export function filterRowsByFabricSaleType(rows: OrderRow[], type: FabricSaleType): OrderRow[] {
  return rows.filter((row) => row.fabricSaleType === type);
}

export function buildSyntheticFilterGroup(options: {
  key: string;
  title: string;
  rows: OrderRow[];
}): OrderGroup {
  const totalQuantity = options.rows.reduce((sum, row) => sum + row.quantity, 0);
  return {
    key: options.key,
    title: options.title,
    positionCount: options.rows.length,
    totalQuantity,
    rows: options.rows,
    copyMarketplaceArticles: false,
  };
}

export function resolveFilteredOrdersView(
  groups: OrderGroup[],
  supplierFilter: string | null,
  fabricTypeFilter: FabricSaleType | null,
): { kind: 'all' } | { kind: 'group'; group: OrderGroup } | { kind: 'empty'; message: string } {
  const supplierMeta = supplierFilter
    ? FABRIC_SUPPLIER_FILTERS.find((item) => item.key === supplierFilter)
    : undefined;

  if (!supplierFilter && !fabricTypeFilter) {
    return { kind: 'all' };
  }

  if (supplierFilter && !fabricTypeFilter) {
    const group = findGroupByKey(groups, supplierFilter);
    if (!group) {
      return {
        kind: 'empty',
        message: `Нет заказов для поставщика «${supplierMeta?.title ?? supplierFilter}»`,
      };
    }
    return { kind: 'group', group };
  }

  if (!supplierFilter && fabricTypeFilter) {
    const rows = groups.flatMap((group) => filterRowsByFabricSaleType(group.rows, fabricTypeFilter));
    if (rows.length === 0) {
      return {
        kind: 'empty',
        message:
          fabricTypeFilter === 'cut' ? 'Нет отрезов для отображения' : 'Нет рулонов для отображения',
      };
    }
    return {
      kind: 'group',
      group: buildSyntheticFilterGroup({
        key: fabricTypeFilter === 'cut' ? 'filter-cut' : 'filter-roll',
        title: fabricTypeFilter === 'cut' ? 'Отрезы' : 'Рулоны',
        rows,
      }),
    };
  }

  // supplier + fabric
  const source = findGroupByKey(groups, supplierFilter!);
  if (!source) {
    return {
      kind: 'empty',
      message: `Нет заказов для поставщика «${supplierMeta?.title ?? supplierFilter}»`,
    };
  }

  const rows = filterRowsByFabricSaleType(source.rows, fabricTypeFilter!);
  if (rows.length === 0) {
    const typeLabel = fabricTypeFilter === 'cut' ? 'отрезов' : 'рулонов';
    return {
      kind: 'empty',
      message: `Нет ${typeLabel} у поставщика «${supplierMeta?.title ?? supplierFilter}»`,
    };
  }

  return {
    kind: 'group',
    group: buildSyntheticFilterGroup({
      key: `filter-${supplierFilter}-${fabricTypeFilter}`,
      title: `${supplierMeta?.title ?? supplierFilter} — ${fabricTypeFilter === 'cut' ? 'Отрезы' : 'Рулоны'}`,
      rows,
    }),
  };
}
