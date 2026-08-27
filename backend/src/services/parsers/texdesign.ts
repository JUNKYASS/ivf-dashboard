import axios from 'axios';
import https from 'https';
import { XMLParser } from 'fast-xml-parser';
import { TD_SHEETNAME } from '../../constants';
import type { StockRow, ThresholdValue } from '../../types';
import { readWorkbookFile, sheetToMatrix } from '../parserUtils';

const FETCH_TIMEOUT_MS = 10_000;

async function fetchXml(url: string): Promise<string> {
  const agent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.get(url, {
      httpsAgent: agent,
      responseType: 'text',
      timeout: FETCH_TIMEOUT_MS,
    });
    if (response.statusText !== 'OK') {
      throw new Error(`Ошибка загрузки XML: ${response.statusText}`);
    }
    const contentType = String(response.headers['content-type'] ?? '');
    if (!contentType.includes('xml')) {
      throw new Error('Ответ не является XML-документом');
    }
    const xmlRawData = String(response.data);
    if (!xmlRawData || xmlRawData.trim() === '') {
      throw new Error('Загруженный XML-файл пустой или повреждён');
    }
    return xmlRawData;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      throw new Error('Выгрузка по URL недоступна');
    }
    throw new Error('Выгрузка по URL недоступна');
  }
}

export async function parseTexdesignStocks(
  url: string,
  mappingPath: string,
  thresholdConfig: ThresholdValue,
): Promise<StockRow[]> {
  const xmlRawData = await fetchXml(url);

  let xmlToJsonData: Record<string, unknown>;
  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    xmlToJsonData = parser.parse(xmlRawData) as Record<string, unknown>;
  } catch (parseError) {
    throw new Error(
      `Не удалось распарсить XML: ${parseError instanceof Error ? parseError.message : 'unknown'}`,
    );
  }

  const ymlCatalog = xmlToJsonData.yml_catalog as {
    shop?: { offers?: { offer?: Array<Record<string, unknown>> } };
  };
  const allItems = ymlCatalog?.shop?.offers?.offer;
  if (!allItems || allItems.length === 0) {
    throw new Error('XML-файл не содержит ни одного товара');
  }

  const workbook = readWorkbookFile(mappingPath);
  const sheet = workbook.Sheets[TD_SHEETNAME];
  if (!sheet) {
    throw new Error('Sheet not found');
  }

  const mappingData = sheetToMatrix(workbook, TD_SHEETNAME);
  const filteredMappingData = mappingData.filter((row) => row[3] !== 0);

  return filteredMappingData
    .filter((value) => value[1])
    .map((article) => {
      const matchedItem = allItems.find((item) => {
        const params = item.param as Array<{ '@_name': string; '#text': string }> | undefined;
        return params?.find((param) => param['@_name'] === 'Артикул')?.['#text'] === article[1];
      });

      const params = matchedItem?.param as Array<{ '@_name': string; '#text': string }> | undefined;
      const qty = params?.find((param) => param['@_name'] === 'Количество')?.['#text'];
      const remain = qty && Number(qty) > thresholdConfig.threshold ? thresholdConfig.remain : 0;

      return [String(article[0]), article[2] as string | undefined, remain];
    });
}
