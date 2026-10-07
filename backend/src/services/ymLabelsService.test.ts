import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildYmOrderCaption,
  expandCaptionsForOrders,
  isYmReportFailed,
  isYmReportReady,
  resolveYmBoxCount,
} from './ymLabelsService';

test('buildYmOrderCaption formats single and multi items', () => {
  assert.equal(
    buildYmOrderCaption([{ offerId: 'GT-220120-BZ-8-LineBlue', count: 1 }]),
    'GT-220120-BZ-8-LineBlue',
  );
  assert.equal(
    buildYmOrderCaption([
      { offerId: 'ART-A', count: 2 },
      { offerId: 'ART-B', count: 1 },
    ]),
    'ART-A x2, ART-B',
  );
});

test('resolveYmBoxCount uses boxesLayout length', () => {
  assert.equal(resolveYmBoxCount({ delivery: { boxesLayout: [{}, {}] } }), 2);
  assert.equal(resolveYmBoxCount({ delivery: {} }), 1);
});

test('expandCaptionsForOrders repeats caption per box', () => {
  const captions = expandCaptionsForOrders([
    {
      orderId: 1,
      campaignId: 10,
      caption: 'ART-A',
      primaryArticle: 'ART-A',
      boxCount: 2,
    },
    {
      orderId: 2,
      campaignId: 10,
      caption: 'ART-B',
      primaryArticle: 'ART-B',
      boxCount: 1,
    },
  ]);
  assert.deepEqual(captions, ['ART-A', 'ART-A', 'ART-B']);
});

test('isYmReportReady and isYmReportFailed', () => {
  assert.equal(isYmReportReady('DONE'), true);
  assert.equal(isYmReportReady('PROCESSING'), false);
  assert.equal(isYmReportFailed('FAILED'), true);
  assert.equal(isYmReportFailed('NO_DATA'), true);
  assert.equal(isYmReportFailed('PENDING'), false);
});
