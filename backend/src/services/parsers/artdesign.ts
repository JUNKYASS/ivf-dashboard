import { AD_SHEETNAME } from '../../constants';
import type { StockRow, ThresholdValue } from '../../types';
import { readWorkbookBuffer, readWorkbookFile, sheetToMatrix } from '../parserUtils';

export function parseArtdesignStocks(
  stocksBuffer: Buffer,
  mappingPath: string,
  thresholdConfig: ThresholdValue,
): StockRow[] {
  const stocksWorkbook = readWorkbookBuffer(stocksBuffer);
  const stocksData = sheetToMatrix(stocksWorkbook);

  const mappingWorkBook = readWorkbookFile(mappingPath);
  const mappingSheet = mappingWorkBook.Sheets[AD_SHEETNAME];
  if (!mappingSheet) {
    throw new Error('Sheet not found');
  }

  const mappingData = sheetToMatrix(mappingWorkBook, AD_SHEETNAME);
  const filteredMappingData = mappingData.filter((row) => row[4] !== 0);

  return filteredMappingData.map((mappingValue) => {
    const valueMatch = stocksData.find(
      (stocksValue) =>
        stocksValue[1] && String(stocksValue[1]).trim() === String(mappingValue[2]).trim(),
    );
    const remain =
      valueMatch && valueMatch.length > 0 && Number(valueMatch[4]) > thresholdConfig.threshold
        ? thresholdConfig.remain
        : 0;

    return [String(mappingValue[0]), mappingValue[3] as string | undefined, remain];
  });
}
