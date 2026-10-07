import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickYmImageUrl } from './ymProductCacheService';

test('pickYmImageUrl returns first non-empty picture URL', () => {
  assert.equal(
    pickYmImageUrl(['https://example.com/1.jpg', 'https://example.com/2.jpg']),
    'https://example.com/1.jpg',
  );
});

test('pickYmImageUrl skips empty strings', () => {
  assert.equal(pickYmImageUrl(['', '  ', 'https://example.com/main.jpg']), 'https://example.com/main.jpg');
});

test('pickYmImageUrl returns null when no pictures', () => {
  assert.equal(pickYmImageUrl([]), null);
  assert.equal(pickYmImageUrl(undefined), null);
});
