import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isWbOrderOnAssembly } from './wbLabelsService';

test('isWbOrderOnAssembly: live confirm + waiting + supply', () => {
  assert.equal(
    isWbOrderOnAssembly({ supplierStatus: 'confirm', wbStatus: 'waiting' }, 'WB-GI-1'),
    true,
  );
});

test('isWbOrderOnAssembly: excludes canceled_by_client leftover confirm', () => {
  assert.equal(
    isWbOrderOnAssembly(
      { supplierStatus: 'confirm', wbStatus: 'canceled_by_client' },
      '',
    ),
    false,
  );
});

test('isWbOrderOnAssembly: excludes confirm without supply', () => {
  assert.equal(
    isWbOrderOnAssembly({ supplierStatus: 'confirm', wbStatus: 'waiting' }, ''),
    false,
  );
});

test('isWbOrderOnAssembly: excludes new / complete', () => {
  assert.equal(
    isWbOrderOnAssembly({ supplierStatus: 'new', wbStatus: 'waiting' }, 'WB-GI-1'),
    false,
  );
  assert.equal(
    isWbOrderOnAssembly({ supplierStatus: 'complete', wbStatus: 'sorted' }, 'WB-GI-1'),
    false,
  );
});
