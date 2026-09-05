import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  aggregateMpstatsComments,
  extractCommentRating,
  parseMpstatsCommentsPayload,
  parseMpstatsItemFullReview,
  pickRicherReviewSummary,
} from './mpstatsService';

test('extractCommentRating uses valuation for MPSTATS comments', () => {
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

test('aggregateMpstatsComments includes ratings without text', () => {
  const aggregate = aggregateMpstatsComments([
    { valuation: 5, text: 'ok' },
    { valuation: 4, text: '' },
    { valuation: 3 },
  ]);

  assert.equal(aggregate.count, 3);
  assert.equal(aggregate.avgRating, 4);
});

test('parseMpstatsCommentsPayload accepts WB wrapped response', () => {
  const comments = parseMpstatsCommentsPayload({
    last_request: 1784061563,
    comments: [{ valuation: 5 }, { valuation: 3 }],
  });

  assert.equal(comments.length, 2);
  assert.equal(comments[0]?.valuation, 5);
});

test('pickRicherReviewSummary prefers card summary with more reviews', () => {
  const picked = pickRicherReviewSummary(
    { count: 1, avgRating: 5 },
    { count: 228, avgRating: 4.8 },
  );

  assert.equal(picked.count, 228);
  assert.equal(picked.avgRating, 4.8);
});

test('pickRicherReviewSummary keeps comments when they are richer', () => {
  const picked = pickRicherReviewSummary(
    { count: 30, avgRating: 4.7 },
    { count: 5, avgRating: 4.9 },
  );

  assert.equal(picked.count, 30);
  assert.equal(picked.avgRating, 4.7);
});

test('parseMpstatsItemFullReview uses card rating and total review count', () => {
  const summary = parseMpstatsItemFullReview({
    rating: 4.79,
    comments: 67,
  });

  assert.equal(summary.count, 67);
  assert.equal(summary.avgRating, 4.79);
});

test('parseMpstatsItemFullReview returns null rating without reviews', () => {
  const summary = parseMpstatsItemFullReview({
    rating: 5,
    comments: 0,
  });

  assert.equal(summary.count, 0);
  assert.equal(summary.avgRating, null);
});

test('parseMpstatsCommentsPayload accepts Ozon array response', () => {
  const comments = parseMpstatsCommentsPayload([{ valuation: 4 }, { valuation: 2 }]);
  assert.equal(comments.length, 2);
});
