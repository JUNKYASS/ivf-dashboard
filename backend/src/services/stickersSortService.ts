import {
  BEDDING_ARTICLE_PREFIXES,
  ORDER_GROUP_KEYS,
  SUPPLIER_PREFIX_CONFIG,
  UNMAPPED_MARKETPLACE_PREFIXES,
  type OrderGroupKey,
} from '../constants';
import { classifyFabricSaleType } from './fabricSaleTypeService';
import { getArticlePrefix } from './mappingLookupService';

function isBeddingArticle(article: string): boolean {
  const prefix = getArticlePrefix(article);
  return (BEDDING_ARTICLE_PREFIXES as readonly string[]).includes(prefix);
}

function isForcedUnmappedArticle(article: string): boolean {
  const prefix = getArticlePrefix(article);
  return (UNMAPPED_MARKETPLACE_PREFIXES as readonly string[]).includes(prefix);
}

export function resolveStickerGroupKey(article: string): OrderGroupKey {
  if (isBeddingArticle(article)) return 'bedding';
  if (isForcedUnmappedArticle(article)) return 'unmapped';

  const prefix = getArticlePrefix(article);
  const supplier = SUPPLIER_PREFIX_CONFIG[prefix];
  if (supplier) return supplier.key as OrderGroupKey;

  return 'unmapped';
}

function fabricTypeSortIndex(article: string): number {
  const type = classifyFabricSaleType(article);
  if (type === 'cut') return 0;
  if (type === 'roll') return 1;
  return 2;
}

function compareStickerArticles(left: string, right: string): number {
  const groupLeft = ORDER_GROUP_KEYS.indexOf(resolveStickerGroupKey(left));
  const groupRight = ORDER_GROUP_KEYS.indexOf(resolveStickerGroupKey(right));
  if (groupLeft !== groupRight) return groupLeft - groupRight;

  const fabricLeft = fabricTypeSortIndex(left);
  const fabricRight = fabricTypeSortIndex(right);
  if (fabricLeft !== fabricRight) return fabricLeft - fabricRight;

  return left.localeCompare(right, 'en', { sensitivity: 'base' });
}

export function sortByProductType<T>(items: T[], getArticle: (item: T) => string): T[] {
  return [...items].sort((left, right) =>
    compareStickerArticles(getArticle(left), getArticle(right)),
  );
}
