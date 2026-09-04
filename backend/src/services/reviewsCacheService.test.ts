import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import { test } from 'node:test';
import {
  addRatingToAggregate,
  aggregateWbFeedbacksForTest,
  createEmptyAggregate,
  formatWbAxiosErrorForTest,
  getWbRetryDelayMsForTest,
  lookupWbReviewRating,
  roundRating,
} from './reviewsCacheService';
import { resolveWbNmIdFromCache } from './wbTitlesCacheService';

test('addRatingToAggregate computes average', () => {
  let aggregate = createEmptyAggregate();
  aggregate = addRatingToAggregate(aggregate, 5);
  aggregate = addRatingToAggregate(aggregate, 3);
  aggregate = addRatingToAggregate(aggregate, 4);

  assert.equal(aggregate.count, 3);
  assert.equal(aggregate.sumRating, 12);
  assert.equal(aggregate.avgRating, 4);
});

test('roundRating keeps two decimals', () => {
  assert.equal(roundRating(4.3333), 4.33);
  assert.equal(roundRating(4.335), 4.34);
});

test('aggregateWbFeedbacks computes average', () => {
  const aggregate = aggregateWbFeedbacksForTest([
    { productValuation: 5 },
    { productValuation: 3 },
    { productValuation: 4 },
  ]);

  assert.equal(aggregate.count, 3);
  assert.equal(aggregate.avgRating, 4);
});

test('formatWbAxiosError explains 403', () => {
  const error = new AxiosError('Request failed with status code 403');
  error.response = {
    status: 403,
    data: {},
    headers: {},
    config: { headers: {} } as never,
    statusText: 'Forbidden',
  };

  const message = formatWbAxiosErrorForTest(error);
  assert.match(message, /Отзывы и вопросы/);
});

test('formatWbAxiosError explains 429 with retry hint', () => {
  const error = new AxiosError('Request failed with status code 429');
  error.response = {
    status: 429,
    data: {},
    headers: { 'x-ratelimit-retry': '5' },
    config: { headers: {} } as never,
    statusText: 'Too Many Requests',
  };

  const message = formatWbAxiosErrorForTest(error);
  assert.match(message, /превышен лимит/);
  assert.match(message, /5 сек/);
});

test('getWbRetryDelayMs reads x-ratelimit-retry', () => {
  const error = new AxiosError('Request failed with status code 429');
  error.response = {
    status: 429,
    data: {},
    headers: { 'x-ratelimit-retry': '4' },
    config: { headers: {} } as never,
    statusText: 'Too Many Requests',
  };

  assert.equal(getWbRetryDelayMsForTest(error), 4000);
});

test('resolveWbNmIdFromCache matches article via title fallback', () => {
  const nmId = resolveWbNmIdFromCache(
    {
      nmIdByArticle: {},
      byArticle: {
        'lt-240105-pst-1-1x1orange': 'Страйп сатин',
      },
      byNmId: {
        '1250156414': 'Страйп сатин',
      },
    },
    'LT-240105-PST-1-1x1orange',
  );

  assert.equal(nmId, '1250156414');
});

test('lookupWbReviewRating returns null avg when no reviews', () => {
  const result = lookupWbReviewRating('missing-article');
  assert.equal(result.count, 0);
  assert.equal(result.avgRating, null);
  assert.equal(result.source, 'cache');
});
