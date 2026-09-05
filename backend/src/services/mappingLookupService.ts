import { MAPPING_SHEETS } from '../constants';
import { MAPPING_PATH } from '../types';
import { readWorkbookFile, sheetToMatrix } from './parserUtils';

export type MappingMatch = {
  supplierArticle: string;
  sheetName: string;
  marketplaceArticle: string;
};

export type MappingIndexes = {
  byMarketplace: Map<string, MappingMatch>;
  bySupplier: Map<string, string[]>;
};

export function normalizeArticle(article: string): string {
  return article.trim().toLowerCase();
}

export function getArticlePrefix(article: string): string {
  const trimmed = article.trim();
  const dashIndex = trimmed.indexOf('-');
  return (dashIndex === -1 ? trimmed : trimmed.slice(0, dashIndex)).toUpperCase();
}

export function buildMappingIndex(): Map<string, MappingMatch> {
  const workbook = readWorkbookFile(MAPPING_PATH);
  const index = new Map<string, MappingMatch>();

  for (const sheet of MAPPING_SHEETS) {
    const rows = sheetToMatrix(workbook, sheet.name);

    for (const row of rows) {
      const marketplaceRaw = row[0];
      if (marketplaceRaw === null || marketplaceRaw === undefined) continue;

      const marketplaceArticle = String(marketplaceRaw).trim();
      if (!marketplaceArticle) continue;

      const supplierRaw = row[sheet.supplierColumnIndex];
      if (supplierRaw === null || supplierRaw === undefined) continue;

      const supplierArticle = String(supplierRaw).trim();
      if (!supplierArticle) continue;

      const key = normalizeArticle(marketplaceArticle);
      const match: MappingMatch = { supplierArticle, sheetName: sheet.name, marketplaceArticle };

      if (index.has(key)) {
        const existing = index.get(key)!;
        console.warn(
          `[mapping] Дублирование артикула "${marketplaceArticle}" на листах "${existing.sheetName}" и "${sheet.name}", используется первое совпадение`,
        );
        continue;
      }

      index.set(key, match);
    }
  }

  return index;
}
