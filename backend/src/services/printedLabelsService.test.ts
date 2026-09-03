import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

let tmpDir = '';
let printedLabels: typeof import('./printedLabelsService');

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'printed-labels-'));
  process.env.STORAGE_DIR = tmpDir;
  printedLabels = await import('./printedLabelsService');
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('markPrinted and isPrinted', () => {
  assert.equal(printedLabels.isPrinted('ozon', '70679248-0294-7'), false);
  printedLabels.markPrinted('ozon', ['70679248-0294-7']);
  assert.equal(printedLabels.isPrinted('ozon', '70679248-0294-7'), true);
  assert.equal(printedLabels.isPrinted('wb', '5414910358'), false);
});

test('filterUnprinted excludes marked ids', () => {
  printedLabels.markPrinted('wb', ['100', '200']);
  assert.deepEqual(printedLabels.filterUnprinted('wb', ['100', '200', '300']), ['300']);
});

test('pruneMarketplace drops ids not in current eligible list', () => {
  printedLabels.markPrinted('ozon', ['A', 'B', 'C']);
  printedLabels.pruneMarketplace('ozon', ['B', 'D']);
  assert.equal(printedLabels.isPrinted('ozon', 'A'), false);
  assert.equal(printedLabels.isPrinted('ozon', 'B'), true);
  assert.equal(printedLabels.isPrinted('ozon', 'C'), false);
});

test('pruneExpiredEntries removes stale ids by TTL', () => {
  const staleAt = new Date(Date.now() - 46 * 24 * 60 * 60 * 1000).toISOString();
  fs.writeFileSync(
    path.join(tmpDir, 'printed-labels.json'),
    JSON.stringify({ ozon: { OLD: staleAt }, wb: {} }, null, 2),
    'utf-8',
  );
  printedLabels.pruneMarketplace('ozon', []);
  assert.equal(printedLabels.isPrinted('ozon', 'OLD'), false);
  const store = JSON.parse(
    fs.readFileSync(path.join(tmpDir, 'printed-labels.json'), 'utf-8'),
  ) as { ozon: Record<string, string> };
  assert.equal(Object.keys(store.ozon).length, 0);
});

test('markPrinted deduplicates ids in one call', () => {
  printedLabels.markPrinted('ozon', ['Z', 'Z', 'Z']);
  const store = JSON.parse(
    fs.readFileSync(path.join(tmpDir, 'printed-labels.json'), 'utf-8'),
  ) as { ozon: Record<string, string> };
  assert.equal(Object.keys(store.ozon).filter((id) => id === 'Z').length, 1);
});
