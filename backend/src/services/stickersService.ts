import { getMarketplaceApiCredentials } from './marketplaceEnvService';
import { generateOzonStickers } from './ozonLabelsService';
import { StickersError } from './stickersShared';
import { generateWbStickers } from './wbLabelsService';

export { StickersError } from './stickersShared';

export type StickersMarketplace = 'ozon' | 'wb';

export type StickersGenerateResult = {
  pdfBytes: Uint8Array;
  count: number;
  skipped: string[];
};

export async function generateStickers(
  marketplace: StickersMarketplace,
): Promise<StickersGenerateResult> {
  const credentials = getMarketplaceApiCredentials();

  if (marketplace === 'ozon') {
    if (!credentials.ozonClientId || !credentials.ozonApiKey) {
      throw new StickersError('Не настроены OZON_CLIENT_ID / OZON_API_KEY');
    }
    return generateOzonStickers(credentials.ozonClientId, credentials.ozonApiKey);
  }

  if (!credentials.wbApiToken) {
    throw new StickersError('Не настроен WB_API_TOKEN');
  }
  return generateWbStickers(credentials.wbApiToken);
}
