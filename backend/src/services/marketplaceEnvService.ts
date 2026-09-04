import fs from 'fs';
import path from 'path';

const MARKETPLACE_ENV_KEYS = ['OZON_CLIENT_ID', 'OZON_API_KEY', 'WB_API_TOKEN', 'MPSTATS_TOKEN'] as const;
type MarketplaceEnvKey = (typeof MARKETPLACE_ENV_KEYS)[number];

function getEnvPath(): string {
  return path.resolve(__dirname, '../../../.env');
}

function maskSecret(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

export type MarketplaceApiPublicConfig = {
  ozon: {
    clientIdConfigured: boolean;
    clientIdMask: string | null;
    apiKeyConfigured: boolean;
    apiKeyMask: string | null;
  };
  wb: {
    apiTokenConfigured: boolean;
    apiTokenMask: string | null;
  };
  mpstats: {
    apiTokenConfigured: boolean;
    apiTokenMask: string | null;
  };
};

export type MarketplaceApiCredentials = {
  ozonClientId: string;
  ozonApiKey: string;
  wbApiToken: string;
  mpstatsToken: string;
};

export function getMarketplaceApiPublicConfig(): MarketplaceApiPublicConfig {
  const clientId = process.env.OZON_CLIENT_ID;
  const apiKey = process.env.OZON_API_KEY;
  const apiToken = process.env.WB_API_TOKEN;
  const mpstatsToken = process.env.MPSTATS_TOKEN;

  return {
    ozon: {
      clientIdConfigured: Boolean(clientId),
      clientIdMask: maskSecret(clientId),
      apiKeyConfigured: Boolean(apiKey),
      apiKeyMask: maskSecret(apiKey),
    },
    wb: {
      apiTokenConfigured: Boolean(apiToken),
      apiTokenMask: maskSecret(apiToken),
    },
    mpstats: {
      apiTokenConfigured: Boolean(mpstatsToken),
      apiTokenMask: maskSecret(mpstatsToken),
    },
  };
}

export function getMarketplaceApiCredentials(): MarketplaceApiCredentials {
  return {
    ozonClientId: process.env.OZON_CLIENT_ID ?? '',
    ozonApiKey: process.env.OZON_API_KEY ?? '',
    wbApiToken: process.env.WB_API_TOKEN ?? '',
    mpstatsToken: process.env.MPSTATS_TOKEN ?? '',
  };
}

export function updateMarketplaceApiConfig(updates: {
  ozonClientId?: string;
  ozonApiKey?: string;
  wbApiToken?: string;
  mpstatsToken?: string;
}): MarketplaceApiPublicConfig {
  const envUpdates: Partial<Record<MarketplaceEnvKey, string>> = {};

  if (updates.ozonClientId?.trim()) {
    envUpdates.OZON_CLIENT_ID = updates.ozonClientId.trim();
  }
  if (updates.ozonApiKey?.trim()) {
    envUpdates.OZON_API_KEY = updates.ozonApiKey.trim();
  }
  if (updates.wbApiToken?.trim()) {
    envUpdates.WB_API_TOKEN = updates.wbApiToken.trim();
  }
  if (updates.mpstatsToken?.trim()) {
    envUpdates.MPSTATS_TOKEN = updates.mpstatsToken.trim();
  }

  if (Object.keys(envUpdates).length > 0) {
    writeEnvUpdates(envUpdates);
  }

  return getMarketplaceApiPublicConfig();
}

function writeEnvUpdates(updates: Partial<Record<MarketplaceEnvKey, string>>): void {
  const envPath = getEnvPath();
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  for (const [key, value] of Object.entries(updates) as [MarketplaceEnvKey, string][]) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;

    if (regex.test(content)) {
      content = content.replace(regex, newLine);
    } else {
      if (content.length > 0 && !content.endsWith('\n')) {
        content += '\n';
      }
      content += `${newLine}\n`;
    }

    process.env[key] = value;
  }

  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, content, 'utf-8');
}
