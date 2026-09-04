import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  aggregateMpstatsComments,
  extractCommentRating,
} from './mpstatsService';

test('extractCommentRating uses valuation for Ozon MPSTATS comments', () => {
  assert.equal(extractCommentRating({ valuation: 5 }), 5);
  assert.equal(extractCommentRating({ rating: 4 }), 4);
  assert.equal(extractCommentRating({ valuation: 0 }), null);
  assert.equal(extractCommentRating({}), null);
});

test('aggregateMpstatsComments computes average', () => {
  const aggregate = aggregateMpstatsComments([
    { valuation: 5 },
    { valuation: 3 },
    { valuation: 4 },
  ]);

  assert.equal(aggregate.count, 3);
  assert.equal(aggregate.avgRating, 4);
});
