import axios from 'axios';
import { YM_API_BASE_URL } from '../constants';

type YmCampaign = {
  id?: number;
  placementType?: string;
  business?: { id?: number };
};

type YmCampaignsResponse = {
  campaigns?: YmCampaign[];
};

export function ymHeaders(apiToken: string): Record<string, string> {
  return {
    'Api-Key': apiToken,
    'Content-Type': 'application/json',
  };
}

export async function fetchYmBusinessId(apiToken: string): Promise<number> {
  const response = await axios.get<YmCampaignsResponse>(`${YM_API_BASE_URL}/v2/campaigns`, {
    headers: ymHeaders(apiToken),
    params: { limit: 100 },
    timeout: 60_000,
  });

  const businessId = response.data?.campaigns?.find((campaign) => campaign.business?.id)?.business
    ?.id;

  if (!businessId) {
    throw new Error('Не найден businessId в кабинете Яндекс Маркета');
  }

  return businessId;
}

export async function fetchFbsCampaignContext(apiToken: string): Promise<{
  businessId: number;
  campaignIds: number[];
}> {
  const response = await axios.get<YmCampaignsResponse>(`${YM_API_BASE_URL}/v2/campaigns`, {
    headers: ymHeaders(apiToken),
    params: { limit: 100 },
    timeout: 60_000,
  });

  const fbsCampaigns = (response.data?.campaigns ?? []).filter(
    (campaign) => campaign.placementType === 'FBS' && campaign.id && campaign.business?.id,
  );

  if (fbsCampaigns.length === 0) {
    throw new Error('Не найдены FBS-магазины в кабинете Яндекс Маркета');
  }

  const businessId = fbsCampaigns[0].business!.id!;
  const campaignIds = fbsCampaigns
    .filter((campaign) => campaign.business!.id === businessId)
    .map((campaign) => campaign.id!);

  return { businessId, campaignIds };
}
