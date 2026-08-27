import fs from 'fs';
import {
  GALTEX_MATERIALS,
  MATERIAL_KEY_TO_THRESHOLD_KEY,
} from '../constants';
import {
  MAPPING_PATH,
  OZON_OUTPUT_PATH,
  StockRow,
  SupplierResult,
  WB_OUTPUT_PATH,
} from '../types';
import { getOutputStatus, readConfig } from './configService';
import { parseArtdesignStocks } from './parsers/artdesign';
import { parseGaltexStocks } from './parsers/galtex';
import { parseLogosStocks } from './parsers/logos';
import { parseTdlStocks } from './parsers/tdl';
import { parseTexdesignStocks } from './parsers/texdesign';
import { parseTtStocks } from './parsers/tt';
import { toOzonRows, toWbRows, writeOutputFiles } from './parserUtils';

export type UploadedFiles = Record<string, Express.Multer.File[]>;

function aggregateSupplierStatus(slots: { status: string }[]): SupplierResult {
  const hasSuccess = slots.some((s) => s.status === 'success');
  const hasError = slots.some((s) => s.status === 'error');
  const allSkipped = slots.every((s) => s.status === 'skipped');

  if (allSkipped) {
    return { status: 'skipped', message: 'Файл не загружен' };
  }
  if (hasSuccess && hasError) {
    return { status: 'success', message: 'Частично обработано' };
  }
  if (hasSuccess) {
    return { status: 'success' };
  }
  return { status: 'error', message: 'Ошибка обработки' };
}

export async function runGeneration(files: UploadedFiles) {
  if (!fs.existsSync(MAPPING_PATH)) {
    throw new Error('Mapping-файл не загружен');
  }

  const config = readConfig();
  const allStockRows: StockRow[] = [];
  const suppliers: Record<string, SupplierResult> = {};

  const galtexSlots = GALTEX_MATERIALS.map((material) => {
    const uploaded = files[material.key]?.[0];
    if (!uploaded) {
      return {
        key: material.key,
        label: material.label,
        status: 'skipped' as const,
        message: 'Файл не загружен',
      };
    }

    try {
      const thresholdKey = MATERIAL_KEY_TO_THRESHOLD_KEY[material.key];
      const thresholdConfig = config.thresholds[thresholdKey];
      const data = parseGaltexStocks(
        uploaded.buffer,
        MAPPING_PATH,
        material.sheetName,
        thresholdConfig,
      );
      allStockRows.push(...data);
      return {
        key: material.key,
        label: material.label,
        status: 'success' as const,
        count: data.length,
      };
    } catch (error) {
      return {
        key: material.key,
        label: material.label,
        status: 'error' as const,
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  });

  const hasGaltexUpload = GALTEX_MATERIALS.some((m) => files[m.key]?.[0]);
  if (hasGaltexUpload) {
    const result = aggregateSupplierStatus(galtexSlots);
    const totalCount = galtexSlots
      .filter((s) => s.status === 'success')
      .reduce((sum, s) => sum + (s.count ?? 0), 0);
    suppliers.galtex = {
      ...result,
      count: totalCount || undefined,
      galtexSlots,
    };
  } else {
    suppliers.galtex = { status: 'skipped', message: 'Файл не загружен', galtexSlots };
  }

  if (!config.texdesignEnabled) {
    suppliers.td = { status: 'skipped', message: 'Отключён' };
  } else {
    const texdesignUrl = config.texdesignUrl?.trim();
    if (!texdesignUrl) {
      suppliers.td = { status: 'skipped', message: 'URL не задан' };
    } else {
      try {
        const data = await parseTexdesignStocks(texdesignUrl, MAPPING_PATH, config.thresholds.td);
        allStockRows.push(...data);
        suppliers.td = { status: 'success', count: data.length };
      } catch (error) {
        suppliers.td = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Неизвестная ошибка',
        };
      }
    }
  }

  const singleFileSuppliers = [
    { id: 'ad', parse: parseArtdesignStocks, thresholdKey: 'ad' },
    { id: 'tdl', parse: parseTdlStocks, thresholdKey: 'tdl' },
    { id: 'logos', parse: parseLogosStocks, thresholdKey: 'logos' },
    { id: 'tt', parse: parseTtStocks, thresholdKey: 'tt' },
  ] as const;

  for (const supplier of singleFileSuppliers) {
    const uploaded = files[supplier.id]?.[0];
    if (!uploaded) {
      suppliers[supplier.id] = { status: 'skipped', message: 'Файл не загружен' };
      continue;
    }

    try {
      const data = supplier.parse(
        uploaded.buffer,
        MAPPING_PATH,
        config.thresholds[supplier.thresholdKey],
      );
      allStockRows.push(...data);
      suppliers[supplier.id] = { status: 'success', count: data.length };
    } catch (error) {
      suppliers[supplier.id] = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  const hasAnySuccess = Object.values(suppliers).some((s) => s.status === 'success');

  if (hasAnySuccess && allStockRows.length > 0) {
    const ozonRows = toOzonRows(allStockRows);
    const wbRows = toWbRows(allStockRows);
    writeOutputFiles(ozonRows, wbRows, OZON_OUTPUT_PATH, WB_OUTPUT_PATH);
  }

  const outputStatus = getOutputStatus();

  return {
    suppliers,
    files: {
      ozon: hasAnySuccess && allStockRows.length > 0 ? 'ozon-stocks.xlsx' : null,
      wb: hasAnySuccess && allStockRows.length > 0 ? 'wb-stocks.xlsx' : null,
    },
    ...outputStatus,
  };
}
