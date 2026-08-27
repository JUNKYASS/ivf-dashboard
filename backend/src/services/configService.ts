import fs from 'fs';
import path from 'path';
import {
  DEFAULT_TEXDESIGN_URL,
  GALTEX_THRESHOLD_KEYS,
} from '../constants';
import {
  AppConfig,
  CONFIG_PATH,
  MAPPING_PATH,
  OUTPUT_DIR,
  STORAGE_DIR,
  ThresholdValue,
} from '../types';

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

const DEFAULT_THRESHOLDS: Record<string, ThresholdValue> = {
  galtex_gt_byaz_220_120: { threshold: 400, remain: 10 },
  galtex_gt_byaz_220_140: { threshold: 400, remain: 10 },
  galtex_gt_byaz_150_120: { threshold: 400, remain: 10 },
  galtex_gt_byaz_150_140: { threshold: 400, remain: 10 },
  galtex_gt_byaz_150_120_solid: { threshold: 400, remain: 10 },
  galtex_gt_byaz_150_140_solid: { threshold: 400, remain: 10 },
  galtex_gt_poplin_220: { threshold: 400, remain: 10 },
  td: { threshold: 600, remain: 5 },
  ad: { threshold: 600, remain: 5 },
  tdl: { threshold: 350, remain: 5 },
  logos: { threshold: 350, remain: 10 },
  tt: { threshold: 250, remain: 10 },
};

function ensureDirs(): void {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
}

function seedMappingFromRoot(): void {
  if (fs.existsSync(MAPPING_PATH)) return;

  const rootMapping = path.resolve(BACKEND_ROOT, '..', 'mapping.xlsx');
  if (!fs.existsSync(rootMapping)) return;

  fs.copyFileSync(rootMapping, MAPPING_PATH);
}

function createDefaultConfig(): AppConfig {
  return {
    texdesignUrl: DEFAULT_TEXDESIGN_URL,
    texdesignEnabled: true,
    thresholds: { ...DEFAULT_THRESHOLDS },
    mappingFile: fs.existsSync(MAPPING_PATH)
      ? {
          storedFileName: 'mapping.xlsx',
          originalFileName: 'mapping.xlsx',
          uploadedAt: new Date().toISOString(),
        }
      : null,
  };
}

export function initStorage(): void {
  ensureDirs();
  seedMappingFromRoot();

  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(createDefaultConfig(), null, 2), 'utf-8');
  }
}

export function readConfig(): AppConfig {
  initStorage();
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(raw) as AppConfig;

  return {
    ...createDefaultConfig(),
    ...config,
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      ...config.thresholds,
    },
  };
}

export function writeConfig(config: AppConfig): void {
  ensureDirs();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function updateTexdesignUrl(url: string): AppConfig {
  const config = readConfig();
  config.texdesignUrl = url;
  writeConfig(config);
  return config;
}

export function updateTexdesignEnabled(enabled: boolean): AppConfig {
  const config = readConfig();
  config.texdesignEnabled = enabled;
  writeConfig(config);
  return config;
}

export function updateThreshold(key: string, value: ThresholdValue): AppConfig {
  const config = readConfig();

  if (key === 'galtex') {
    for (const galtexKey of GALTEX_THRESHOLD_KEYS) {
      config.thresholds[galtexKey] = { ...value };
    }
  } else {
    config.thresholds[key] = { ...value };
  }

  writeConfig(config);
  return config;
}

export function updateMappingMeta(originalFileName: string): AppConfig {
  const config = readConfig();
  config.mappingFile = {
    storedFileName: 'mapping.xlsx',
    originalFileName,
    uploadedAt: new Date().toISOString(),
  };
  writeConfig(config);
  return config;
}

export function getOutputStatus() {
  const ozonPath = path.join(OUTPUT_DIR, 'ozon-stocks.xlsx');
  const wbPath = path.join(OUTPUT_DIR, 'wb-stocks.xlsx');
  const hasOzon = fs.existsSync(ozonPath);
  const hasWb = fs.existsSync(wbPath);

  let outputGeneratedAt: string | null = null;
  if (hasOzon) {
    outputGeneratedAt = fs.statSync(ozonPath).mtime.toISOString();
  } else if (hasWb) {
    outputGeneratedAt = fs.statSync(wbPath).mtime.toISOString();
  }

  return {
    hasOutput: { ozon: hasOzon, wb: hasWb },
    outputGeneratedAt,
  };
}

export function getPublicConfig(config: AppConfig) {
  const firstGaltex = config.thresholds[GALTEX_THRESHOLD_KEYS[0]];
  const outputStatus = getOutputStatus();

  return {
    texdesignUrl: config.texdesignUrl,
    texdesignEnabled: config.texdesignEnabled,
    thresholds: config.thresholds,
    galtexThreshold: firstGaltex,
    mappingFile: config.mappingFile,
    hasMapping: fs.existsSync(MAPPING_PATH),
    ...outputStatus,
  };
}
