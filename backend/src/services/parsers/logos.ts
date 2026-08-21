import { LOGOS_SHEETNAME } from '../../constants';
import type { StockRow, ThresholdValue } from '../../types';
import { readWorkbookBuffer, readWorkbookFile, sheetToMatrix } from '../parserUtils';

export function parseLogosStocks(
  stocksBuffer: Buffer,
  mappingPath: string,
  thresholdConfig: ThresholdValue,
): StockRow[] {
  const stocksWorkbook = readWorkbookBuffer(stocksBuffer);
  const stocksData = sheetToMatrix(stocksWorkbook);

  const mappingWorkBook = readWorkbookFile(mappingPath);
  const mappingSheet = mappingWorkBook.Sheets[LOGOS_SHEETNAME];
  if (!mappingSheet) {
    throw new Error('Sheet not found');
  }

  const mappingData = sheetToMatrix(mappingWorkBook, LOGOS_SHEETNAME);
  const filteredMappingData = mappingData.filter((row) => row[3] !== 0);

  return filteredMappingData.map((mappingValue) => {
    const valueMatch = stocksData.find(
      (stocksValue) =>
        stocksValue[0] && String(stocksValue[0]).trim() === String(mappingValue[1]).trim(),
    );
    const remain =
      valueMatch && valueMatch.length > 0 && Number(valueMatch[14]) > thresholdConfig.threshold
        ? thresholdConfig.remain
        : 0;

    return [String(mappingValue[0]), mappingValue[2] as string | undefined, remain];
  });
}
