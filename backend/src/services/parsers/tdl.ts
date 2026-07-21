import { TDL_BYAZ_220_SOLID_SHEETNAME } from '../../constants';
import type { StockRow, ThresholdValue } from '../../types';
import { readWorkbookBuffer, readWorkbookFile, sheetToMatrix } from '../parserUtils';

export function parseTdlStocks(
  stocksBuffer: Buffer,
  mappingPath: string,
  thresholdConfig: ThresholdValue,
): StockRow[] {
  const stocksWorkbook = readWorkbookBuffer(stocksBuffer);
  const stocksData = sheetToMatrix(stocksWorkbook);

  const mappingWorkBook = readWorkbookFile(mappingPath);
  const mappingSheet = mappingWorkBook.Sheets[TDL_BYAZ_220_SOLID_SHEETNAME];
  if (!mappingSheet) {
    throw new Error('Sheet not found');
  }

  const mappingData = sheetToMatrix(mappingWorkBook, TDL_BYAZ_220_SOLID_SHEETNAME);
  const filteredMappingData = mappingData.filter((row) => row[3] !== 0);

  return filteredMappingData.map((mappingValue) => {
    const valueMatch = stocksData.find(
      (stocksValue) =>
        stocksValue[3] && String(stocksValue[3]).trim() === String(mappingValue[1]).trim(),
    );
    const remain =
      valueMatch && valueMatch.length > 0 && Number(valueMatch[4]) > thresholdConfig.threshold
        ? thresholdConfig.remain
        : 0;

    return [String(mappingValue[0]), mappingValue[3] as string | undefined, remain];
  });
}
