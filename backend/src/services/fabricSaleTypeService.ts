import {
  FABRIC_CUT_MAX_LENGTH_M,
  FABRIC_MATERIAL_CODE_ORDER,
  SUPPLIER_PREFIX_CONFIG,
} from '../constants';
import type { FabricSaleType } from '../types';
import { getArticlePrefix } from './mappingLookupService';

export function isFabricSupplierPrefix(article: string): boolean {
  const prefix = getArticlePrefix(article);
  return prefix in SUPPLIER_PREFIX_CONFIG;
}

export function parseFabricLengthMeters(article: string): number | null {
  const segments = article
    .split('-')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const upper = segments.map((segment) => segment.toUpperCase());

  let materialIndex = -1;
  for (const code of FABRIC_MATERIAL_CODE_ORDER) {
    const index = upper.indexOf(code);
    if (index !== -1) {
      materialIndex = index;
      break;
    }
  }

  if (materialIndex === -1) return null;

  const lengthRaw = segments[materialIndex + 1];
  if (!lengthRaw || !/^\d+$/.test(lengthRaw)) return null;

  return Number.parseInt(lengthRaw, 10);
}

export function classifyFabricSaleType(article: string): FabricSaleType | null {
  if (!isFabricSupplierPrefix(article)) return null;

  const lengthM = parseFabricLengthMeters(article);
  if (lengthM === null) return null;

  return lengthM <= FABRIC_CUT_MAX_LENGTH_M ? 'cut' : 'roll';
}
