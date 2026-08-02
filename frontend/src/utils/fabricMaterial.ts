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

    const dimsA = parseMarketplaceArticleDimensions(a.marketplaceArticle);
    const dimsB = parseMarketplaceArticleDimensions(b.marketplaceArticle);

    const byWidth = (dimsA.widthCm ?? Number.POSITIVE_INFINITY) - (dimsB.widthCm ?? Number.POSITIVE_INFINITY);
    if (byWidth !== 0) return byWidth;

    const byDensity =
      (dimsA.densityGr ?? Number.POSITIVE_INFINITY) - (dimsB.densityGr ?? Number.POSITIVE_INFINITY);
    if (byDensity !== 0) return byDensity;

    const articleA = a.supplierArticle ?? a.marketplaceArticle;
    const articleB = b.supplierArticle ?? b.marketplaceArticle;
    return articleA.localeCompare(articleB, 'ru');
  });
}

export function parseMarketplaceArticleDimensions(marketplaceArticle: string): {
  materialName: string | null;
  widthCm: number | null;
  densityGr: number | null;
} {
  const segments = marketplaceArticle.split('-').map((segment) => segment.trim()).filter(Boolean);
  const materialName = extractFabricMaterialName(marketplaceArticle);
  const specsRaw = segments[1]?.toUpperCase() ?? '';

  if (!/^\d{6}$/.test(specsRaw)) {
    return { materialName, widthCm: null, densityGr: null };
  }

  return {
    materialName,
    widthCm: Number.parseInt(specsRaw.slice(0, 3), 10),
    densityGr: Number.parseInt(specsRaw.slice(3, 6), 10),
  };
}

function formatSupplierCopyLine(
  marketplaceArticle: string,
  supplierArticle: string,
  quantity: number,
): string {
  const { materialName, widthCm, densityGr } = parseMarketplaceArticleDimensions(marketplaceArticle);

  if (materialName && widthCm && densityGr) {
    return `${materialName} ${widthCm}см ${densityGr}гр / ${quantity} шт / ${supplierArticle}`;
  }

  if (materialName) {
    return `${supplierArticle} (${materialName}) Кол-во: ${quantity}шт`;
  }

  return `${supplierArticle} Кол-во: ${quantity}шт`;
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

  return formatSupplierCopyLine(row.marketplaceArticle, row.supplierArticle, row.quantity);
}
