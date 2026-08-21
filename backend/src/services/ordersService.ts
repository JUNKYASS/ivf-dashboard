import fs from 'fs';
import {
  BEDDING_ARTICLE_PREFIXES,
  ORDER_GROUP_KEYS,
  SUPPLIER_PREFIX_CONFIG,
  UNMAPPED_MARKETPLACE_PREFIXES,
} from '../constants';
import type {
  MarketplaceFetchStatus,
  OrderGroup,
  OrderRow,
  OrdersFetchResponse,
  RawOrderLine,
} from '../types';
import { MAPPING_PATH } from '../types';
import {
  buildMappingIndex,
  getArticlePrefix,
  normalizeArticle,
} from './mappingLookupService';
import { getMarketplaceApiCredentials } from './marketplaceEnvService';
import { fetchOzonOrders } from './ozonOrdersService';
import { fetchWbOrders } from './wbOrdersService';
import { buildWarehouseStockIndex } from './warehouseStockService';
import { classifyFabricSaleType } from './fabricSaleTypeService';

type AggregatedLine = {
  marketplaceArticle: string;
  productTitle: string | null;
  quantity: number;
  postingNumbers: string[];
};

type ClassifiedLine = AggregatedLine & {
  groupKey: (typeof ORDER_GROUP_KEYS)[number];
  supplierArticle: string | null;
};

const GROUP_TITLES: Record<(typeof ORDER_GROUP_KEYS)[number], string> = {
  galtex: 'Galtex',
  texdesign: 'ТексДизайн',
  kumtex: 'КумТекс',
  artdesign: 'АртДизайн',
  tt: 'Традиции Текстиля',
  logatex: 'ЛогатексПРО',
  tdl: 'ТДЛ',
  chanshu: 'Чаншу',
  lakitex: 'ЛакиТекс',
  fenix: 'Феникс',
  bedding: 'Постельное белье',
  unmapped: 'Без сопоставления',
};

function isBeddingArticle(article: string): boolean {
  const prefix = getArticlePrefix(article);
  return (BEDDING_ARTICLE_PREFIXES as readonly string[]).includes(prefix);
}

function isForcedUnmappedArticle(article: string): boolean {
  const prefix = getArticlePrefix(article);
  return (UNMAPPED_MARKETPLACE_PREFIXES as readonly string[]).includes(prefix);
}

function resolveGroupByMarketplacePrefix(
  marketplaceArticle: string,
): (typeof ORDER_GROUP_KEYS)[number] | null {
  const prefix = getArticlePrefix(marketplaceArticle);
  const supplier = SUPPLIER_PREFIX_CONFIG[prefix];
  return supplier ? (supplier.key as (typeof ORDER_GROUP_KEYS)[number]) : null;
}

function classifyArticle(
  marketplaceArticle: string,
  mappingIndex: Map<string, { supplierArticle: string; sheetName: string }>,
): Pick<ClassifiedLine, 'groupKey' | 'supplierArticle'> {
  if (isBeddingArticle(marketplaceArticle)) {
    return { groupKey: 'bedding', supplierArticle: null };
  }

  if (isForcedUnmappedArticle(marketplaceArticle)) {
    return { groupKey: 'unmapped', supplierArticle: null };
  }

  const match = mappingIndex.get(normalizeArticle(marketplaceArticle));
  const supplierArticle = match?.supplierArticle ?? null;

  const groupKey = resolveGroupByMarketplacePrefix(marketplaceArticle);
  if (groupKey) {
    return { groupKey, supplierArticle };
  }

  return { groupKey: 'unmapped', supplierArticle };
}

function aggregateRawLines(lines: RawOrderLine[]): AggregatedLine[] {
  const map = new Map<string, AggregatedLine>();

  for (const line of lines) {
    const key = normalizeArticle(line.marketplaceArticle);
    const existing = map.get(key);

    if (existing) {
      existing.quantity += line.quantity;
      if (!existing.productTitle && line.productTitle) {
        existing.productTitle = line.productTitle;
      }
      if (!existing.postingNumbers.includes(line.postingNumber)) {
        existing.postingNumbers.push(line.postingNumber);
      }
    } else {
      map.set(key, {
        marketplaceArticle: line.marketplaceArticle,
        productTitle: line.productTitle,
        quantity: line.quantity,
        postingNumbers: [line.postingNumber],
      });
    }
  }

  return Array.from(map.values());
}

function buildGroups(
  classifiedLines: ClassifiedLine[],
  warehouseIndex: Map<string, number>,
): OrderGroup[] {
  const grouped = new Map<(typeof ORDER_GROUP_KEYS)[number], OrderRow[]>();

  for (const line of classifiedLines) {
    const rows = grouped.get(line.groupKey) ?? [];
    rows.push({
      marketplaceArticle: line.marketplaceArticle,
      productTitle: line.productTitle,
      supplierArticle: line.supplierArticle,
      quantity: line.quantity,
      warehouseStock:
        warehouseIndex.get(normalizeArticle(line.marketplaceArticle)) ?? 0,
      fabricSaleType: classifyFabricSaleType(line.marketplaceArticle),
      postingNumbers: line.postingNumbers,
    });
    grouped.set(line.groupKey, rows);
  }

  return ORDER_GROUP_KEYS.filter((key) => grouped.has(key)).map((key) => {
    const rows = grouped.get(key)!;
    const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);

    return {
      key,
      title: GROUP_TITLES[key],
      positionCount: rows.length,
      totalQuantity,
      rows,
      copyMarketplaceArticles: key === 'bedding' || key === 'unmapped',
    };
  });
}

async function fetchMarketplaceLines(
  marketplace: 'ozon' | 'wb',
  fetcher: () => Promise<RawOrderLine[]>,
): Promise<{ lines: RawOrderLine[]; status: MarketplaceFetchStatus }> {
  try {
    const lines = await fetcher();
    return {
      lines,
      status: {
        status: 'success',
        positionCount: lines.length,
        message: `получено ${lines.length} поз.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error(`[orders] Ошибка ${marketplace}:`, error);
    return {
      lines: [],
      status: { status: 'error', message },
    };
  }
}

export async function fetchAndProcessOrders(): Promise<OrdersFetchResponse> {
  if (!fs.existsSync(MAPPING_PATH)) {
    throw new Error('Mapping-файл не загружен, сопоставление артикулов невозможно');
  }

  const credentials = getMarketplaceApiCredentials();
  const mappingIndex = buildMappingIndex();
  const warehouseIndex = buildWarehouseStockIndex();

  const [ozonResult, wbResult] = await Promise.all([
    credentials.ozonClientId && credentials.ozonApiKey
      ? fetchMarketplaceLines('ozon', () =>
          fetchOzonOrders(credentials.ozonClientId, credentials.ozonApiKey),
        )
      : {
          lines: [] as RawOrderLine[],
          status: {
            status: 'error' as const,
            message: 'Не настроены OZON_CLIENT_ID / OZON_API_KEY',
          },
        },
    credentials.wbApiToken
      ? fetchMarketplaceLines('wb', () => fetchWbOrders(credentials.wbApiToken))
      : {
          lines: [] as RawOrderLine[],
          status: {
            status: 'error' as const,
            message: 'Не настроен WB_API_TOKEN',
          },
        },
  ]);

  const rawLines = [...ozonResult.lines, ...wbResult.lines];
  const aggregated = aggregateRawLines(rawLines);

  const classified: ClassifiedLine[] = aggregated.map((line) => ({
    ...line,
    ...classifyArticle(line.marketplaceArticle, mappingIndex),
  }));

  return {
    marketplaceStatus: {
      ozon: ozonResult.status,
      wb: wbResult.status,
    },
    groups: buildGroups(classified, warehouseIndex),
  };
}
