/** FBS: POST …/orders — PENDING в statuses API не принимает (BAD_REQUEST). */
export const YM_FBS_ORDERS_LIST_STATUSES = ['PROCESSING'] as const;

const YM_FBS_PROCESSING_SUBSTATUSES = new Set(['STARTED', 'READY_TO_SHIP']);

export function isYmFbsAssemblyEligible(
  status: string | undefined,
  substatus: string | undefined,
): boolean {
  if (status !== 'PROCESSING') return false;
  return Boolean(substatus && YM_FBS_PROCESSING_SUBSTATUSES.has(substatus));
}

export function buildYmFbsOrdersListRequestBody(campaignIds: number[]): {
  statuses: string[];
  programTypes: ['FBS'];
  campaignIds: number[];
  fake: false;
} {
  return {
    statuses: [...YM_FBS_ORDERS_LIST_STATUSES],
    programTypes: ['FBS'],
    campaignIds,
    fake: false,
  };
}
