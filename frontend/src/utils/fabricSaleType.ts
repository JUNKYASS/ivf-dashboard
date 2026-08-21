import type { FabricSaleType, OrderGroup, OrderRow } from '../types';

const FABRIC_SUPPLIER_PREFIXES = [
  'GT',
  'TD',
  'QUM',
  'AD',
  'TT',
  'LTP',
  'TDL',
  'CHN',
  'LT',
  'FNX',
] as const;

export function isFabricArticle(article: string): boolean {
  const prefix = article.trim().split('-')[0]?.toUpperCase() ?? '';
  return (FABRIC_SUPPLIER_PREFIXES as readonly string[]).includes(prefix);
}

export type FabricRowBuckets = {
  cuts: OrderRow[];
  rolls: OrderRow[];
  otherFabric: OrderRow[];
  nonFabric: OrderRow[];
};

export function splitRowsByFabricSaleType(rows: OrderRow[]): FabricRowBuckets {
  const cuts: OrderRow[] = [];
  const rolls: OrderRow[] = [];
  const otherFabric: OrderRow[] = [];
  const nonFabric: OrderRow[] = [];

  for (const row of rows) {
    if (!isFabricArticle(row.marketplaceArticle)) {
      nonFabric.push(row);
      continue;
    }

    if (row.fabricSaleType === 'cut') {
      cuts.push(row);
    } else if (row.fabricSaleType === 'roll') {
      rolls.push(row);
    } else {
      otherFabric.push(row);
    }
  }

  return { cuts, rolls, otherFabric, nonFabric };
}

export function collectRowsByFabricSaleType(
  groups: OrderGroup[],
  type: FabricSaleType,
): OrderRow[] {
  const rows: OrderRow[] = [];
  for (const group of groups) {
    for (const row of group.rows) {
      if (row.fabricSaleType === type) {
        rows.push(row);
      }
    }
  }
  return rows;
}

export function fabricSaleTypeLabel(type: FabricSaleType): string {
  return type === 'cut' ? 'отрез' : 'рулон';
}
