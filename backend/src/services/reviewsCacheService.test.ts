import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addRatingToAggregate,
  createEmptyAggregate,
  lookupWbReviewRating,
  roundRating,
  sortGroupMembersByRating,
} from './reviewsCacheService';
import { resolveWbNmIdFromCache, listWbGroupMembersFromCache } from './wbTitlesCacheService';

test('sortGroupMembersByRating orders by ascending rating', () => {
  const sorted = sortGroupMembersByRating([
    {
      article: 'B',
      resolvedKey: 'nmId:2',
      count: 10,
      avgRating: 4.8,
      isRequested: false,
    },
    {
      article: 'A',
      resolvedKey: 'nmId:1',
      count: 5,
      avgRating: 4.2,
      isRequested: true,
    },
    {
      article: 'C',
      resolvedKey: 'nmId:3',
      count: 0,
      avgRating: null,
      isRequested: false,
    },
  ]);

  assert.equal(sorted[0]?.article, 'A');
  assert.equal(sorted[1]?.article, 'B');
  assert.equal(sorted[2]?.article, 'C');
});

test('listWbGroupMembersFromCache returns siblings by imtId', () => {
  const members = listWbGroupMembersFromCache(
    {
      nmIdByArticle: {},
      byArticle: {},
      byNmId: {},
      articleByNmId: {
        '111': 'LT-red',
        '222': 'LT-blue',
      },
      imtIdByNmId: {
        '111': '9001',
        '222': '9001',
      },
      nmIdsByImtId: {
        '9001': ['111', '222'],
      },
      imageByArticle: {},
      imageByNmId: {},
      updatedAt: '',
    },
    '111',
  );

  assert.equal(members.length, 2);
  assert.equal(members[0]?.article, 'LT-red');
  assert.equal(members[1]?.article, 'LT-blue');
});

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
