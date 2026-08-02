const FABRIC_MATERIAL_CODES: Record<string, string> = {
  BZ: 'Бязь',
  PP: 'Поплин',
  PK: 'Перкаль',
  ST: 'Сатин',
  SST: 'Страйп-сатин',
  VFP: 'Вафельное полотно',
  RG: 'Рогожка',
  PST: 'Полисатин',
  SPST: 'Страйп полисатин',
  OXF600D: 'Оксфорд 600D',
};

/** Порядок материалов при копировании артикулов поставщика */
export const FABRIC_MATERIAL_NAME_SORT_ORDER = [
  'Бязь',
  'Поплин',
  'Перкаль',
  'Сатин',
  'Страйп-сатин',
  'Вафельное полотно',
  'Рогожка',
  'Полисатин',
  'Страйп полисатин',
  'Оксфорд 600D',
] as const;

/** Длинные коды первыми, чтобы SST не совпал как ST */
const FABRIC_MATERIAL_CODE_ORDER = [
  'OXF600D',
  'SPST',
  'SST',
  'PST',
  'VFP',
  'BZ',
  'PP',
  'PK',
  'ST',
  'RG',
] as const;

export function extractFabricMaterialName(marketplaceArticle: string): string | null {
  const segments = marketplaceArticle.split('-').map((segment) => segment.toUpperCase());

  for (const code of FABRIC_MATERIAL_CODE_ORDER) {
    if (segments.includes(code)) {
      return FABRIC_MATERIAL_CODES[code];
    }
  }

  return null;
}

export function getFabricMaterialSortIndex(marketplaceArticle: string): number {
  const materialName = extractFabricMaterialName(marketplaceArticle);
  if (!materialName) return FABRIC_MATERIAL_NAME_SORT_ORDER.length;

  const index = FABRIC_MATERIAL_NAME_SORT_ORDER.indexOf(
    materialName as (typeof FABRIC_MATERIAL_NAME_SORT_ORDER)[number],
  );
  return index === -1 ? FABRIC_MATERIAL_NAME_SORT_ORDER.length : index;
}

export function sortRowsForSupplierCopy<
  T extends { marketplaceArticle: string; supplierArticle: string | null },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byMaterial =
      getFabricMaterialSortIndex(a.marketplaceArticle) -
      getFabricMaterialSortIndex(b.marketplaceArticle);
    if (byMaterial !== 0) return byMaterial;

    const articleA = a.supplierArticle ?? a.marketplaceArticle;
    const articleB = b.supplierArticle ?? b.marketplaceArticle;
    return articleA.localeCompare(articleB, 'ru');
  });
}

export function formatOrderRowForCopy(
  row: { marketplaceArticle: string; supplierArticle: string | null; quantity: number },
  copyMarketplaceArticles: boolean,
): string {
  if (copyMarketplaceArticles) {
    return `${row.marketplaceArticle} Кол-во: ${row.quantity}шт`;
  }

  if (!row.supplierArticle) {
    return `${row.marketplaceArticle} Кол-во: ${row.quantity}шт`;
  }

  const materialName = extractFabricMaterialName(row.marketplaceArticle);
  const article = materialName
    ? `${row.supplierArticle} (${materialName})`
    : row.supplierArticle;

  return `${article} Кол-во: ${row.quantity}шт`;
}
