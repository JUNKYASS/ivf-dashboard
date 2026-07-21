import {
  GT_BYAZ_150_120_SHEETNAME,
  GT_BYAZ_150_120_SOLID_SHEETNAME,
  GT_BYAZ_150_140_SHEETNAME,
  GT_BYAZ_150_140_SOLID_SHEETNAME,
  GT_BYAZ_220_120_SHEETNAME,
  GT_BYAZ_220_140_SHEETNAME,
  GT_POPLIN_220_SHEETNAME,
  NAME_POSTFIX,
} from '../../constants';
import type { StockRow, ThresholdValue } from '../../types';
import {
  readWorkbookBuffer,
  readWorkbookFile,
  sheetToMatrix,
  stringToInt,
} from '../parserUtils';

export function detectGaltexSheetName(materialNameRow: string): string | undefined {
  if (materialNameRow.includes('Бязь') && materialNameRow.includes('(220см/120гр) наб')) {
    return GT_BYAZ_220_120_SHEETNAME;
  }
  if (materialNameRow.includes('Бязь') && materialNameRow.includes('(220см/140гр) наб')) {
    return GT_BYAZ_220_140_SHEETNAME;
  }
  if (materialNameRow.includes('Бязь') && materialNameRow.includes('(150см/120гр) наб')) {
    return GT_BYAZ_150_120_SHEETNAME;
  }
  if (materialNameRow.includes('Бязь') && materialNameRow.includes('(150см/140гр) наб')) {
    return GT_BYAZ_150_140_SHEETNAME;
  }
  if (materialNameRow.includes('Бязь') && materialNameRow.includes('(150см/120гр) гл/кр')) {
    return GT_BYAZ_150_120_SOLID_SHEETNAME;
  }
  if (materialNameRow.includes('Бязь') && materialNameRow.includes('(150см/140гр) гл/кр')) {
    return GT_BYAZ_150_140_SOLID_SHEETNAME;
  }
  if (materialNameRow.includes('Поплин')) {
    return GT_POPLIN_220_SHEETNAME;
  }
  return undefined;
}

export function parseGaltexStocks(
  stocksBuffer: Buffer,
  mappingPath: string,
  expectedSheetName: string,
  thresholdConfig: ThresholdValue,
): StockRow[] {
  const stocksWorkbook = readWorkbookBuffer(stocksBuffer);
  const stocksSheetName = stocksWorkbook.SheetNames[0];
  const stocksData = sheetToMatrix(stocksWorkbook, stocksSheetName);

  const materialNameRowIndex = stocksData.findIndex((value) => value[0] === 'Характеристика') + 1;
  const materialNameRow = stocksData[materialNameRowIndex]?.[0];
  if (!materialNameRow || typeof materialNameRow !== 'string') {
    throw new Error('Material name empty');
  }

  const sheetName = detectGaltexSheetName(materialNameRow);
  if (!sheetName) {
    throw new Error('Material name not found');
  }

  if (sheetName !== expectedSheetName) {
    throw new Error('Неверный материал');
  }

  const kharakteristikaRow = stocksData.find((value) => value[0] === 'Характеристика');
  if (!kharakteristikaRow) {
    throw new Error('kharakteristika row not found');
  }

  const stocksCountHeadingIndex = kharakteristikaRow.findIndex((value) => value === 'Остаток');
  const mappingWorkBook = readWorkbookFile(mappingPath);
  const mappingSheet = mappingWorkBook.Sheets[sheetName];
  if (!mappingSheet) {
    throw new Error('Sheet not found');
  }

  const mappingData = sheetToMatrix(mappingWorkBook, sheetName);
  const filteredMappingData = mappingData.filter(
    (row) => row[0] && row[1] && row[3] !== 0,
  );
  const stocksFileValues = stocksData.slice(5);

  return filteredMappingData.map((value, i) => {
    const valueMatch = stocksFileValues.filter((value2) =>
      (String(value2[0] ?? '') + NAME_POSTFIX).includes(String(value[1] ?? '')),
    );
    const greaterValue =
      valueMatch.length > 1
        ? (valueMatch[0][stocksCountHeadingIndex] as number) >
          (valueMatch[1][stocksCountHeadingIndex] as number)
          ? valueMatch[0]
          : valueMatch[1]
        : valueMatch[0];
    const remain =
      greaterValue &&
      greaterValue.length > 0 &&
      stringToInt(greaterValue[stocksCountHeadingIndex]) > thresholdConfig.threshold
        ? thresholdConfig.remain
        : 0;

    return [String(filteredMappingData[i][0]), filteredMappingData[i][2] as string | undefined, remain];
  });
}
