import { getMarketplaceApiCredentials } from './marketplaceEnvService';
import { generateOzonStickers } from './ozonLabelsService';
import { markPrinted } from './printedLabelsService';
import { StickersError, type StickersScope } from './stickersShared';
import { generateWbStickers } from './wbLabelsService';
import { generateYmStickers } from './ymLabelsService';

export { StickersError } from './stickersShared';

export type StickersMarketplace = 'ozon' | 'wb' | 'ym';

export type StickersGenerateResult = {
  pdfBytes: Uint8Array;
  count: number;
  skipped: string[];
};

export type StickersGenerateOptions = {
  scope?: StickersScope;
};

export async function generateStickers(
  marketplace: StickersMarketplace,
  options: StickersGenerateOptions = {},
): Promise<StickersGenerateResult> {
  const scope = options.scope ?? 'all';
  const credentials = getMarketplaceApiCredentials();

  if (marketplace === 'ozon') {
    if (!credentials.ozonClientId || !credentials.ozonApiKey) {
      throw new StickersError('Не настроены OZON_CLIENT_ID / OZON_API_KEY');
    }
    const result = await generateOzonStickers(
      credentials.ozonClientId,
      credentials.ozonApiKey,
      scope,
    );
    markPrinted('ozon', result.printedIds);
    return {
      pdfBytes: result.pdfBytes,
      count: result.count,
      skipped: result.skipped,
    };
  }

  if (marketplace === 'wb') {
    if (!credentials.wbApiToken) {
      throw new StickersError('Не настроен WB_API_TOKEN');
    }
    const result = await generateWbStickers(credentials.wbApiToken, scope);
    markPrinted('wb', result.printedIds);
    return {
      pdfBytes: result.pdfBytes,
      count: result.count,
      skipped: result.skipped,
    };
  }

  if (!credentials.ymApiToken) {
    throw new StickersError('Не настроен YM_API_TOKEN');
  }
  const result = await generateYmStickers(credentials.ymApiToken, scope);
  markPrinted('ym', result.printedIds);
  return {
    pdfBytes: result.pdfBytes,
    count: result.count,
    skipped: result.skipped,
  };
}
