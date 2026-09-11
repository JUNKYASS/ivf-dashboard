import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveStickerGroupKey, sortByProductType } from './stickersSortService';

test('resolveStickerGroupKey: supplier prefix and bedding', () => {
  assert.equal(resolveStickerGroupKey('LT-240105-PST-1-1x1orange'), 'lakitex');
  assert.equal(resolveStickerGroupKey('GT-220120-BZ-33-Aquarelle'), 'galtex');
  assert.equal(resolveStickerGroupKey('SHF-123'), 'bedding');
  assert.equal(resolveStickerGroupKey('UNKNOWN-1'), 'unmapped');
});

test('sortByProductType: groups by supplier, then cut/roll, then article', () => {
  const items = [
    { id: 'ozon-3', article: 'LT-240105-PST-50-roll' },
    { id: 'ozon-1', article: 'SHF-100' },
    { id: 'ozon-2', article: 'LT-240105-PST-1-cut' },
    { id: 'ozon-4', article: 'GT-220120-BZ-5-cut' },
    { id: 'ozon-5', article: 'LT-240105-PST-2-cut' },
  ];

  const sorted = sortByProductType(items, (item) => item.article);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ['ozon-4', 'ozon-2', 'ozon-5', 'ozon-3', 'ozon-1'],
  );
});
