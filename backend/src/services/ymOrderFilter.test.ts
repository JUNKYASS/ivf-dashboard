import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isYmFbsAssemblyEligible } from './ymOrderFilter';

test('isYmFbsAssemblyEligible: PROCESSING STARTED and READY_TO_SHIP only', () => {
  assert.equal(isYmFbsAssemblyEligible('PENDING', 'AWAIT_CONFIRMATION'), false);
  assert.equal(isYmFbsAssemblyEligible('PROCESSING', 'STARTED'), true);
  assert.equal(isYmFbsAssemblyEligible('PROCESSING', 'READY_TO_SHIP'), true);
  assert.equal(isYmFbsAssemblyEligible('PROCESSING', 'SHIPPED'), false);
  assert.equal(isYmFbsAssemblyEligible('DELIVERY', 'DELIVERY_SERVICE_RECEIVED'), false);
});
