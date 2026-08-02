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

export function formatSupplierArticleForCopy(
  marketplaceArticle: string,
  supplierArticle: string,
  quantity: number,
): string {
  const materialName = extractFabricMaterialName(marketplaceArticle);
  const article = materialName ? `${supplierArticle} (${materialName})` : supplierArticle;
  return `${article} Кол-во: ${quantity}шт`;
}
