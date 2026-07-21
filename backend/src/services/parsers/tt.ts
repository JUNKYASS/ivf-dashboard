import { TT_SHEETNAME } from '../../constants';
import type { StockRow, ThresholdValue } from '../../types';
import { readWorkbookBuffer, readWorkbookFile, sheetToMatrix, stringToInt } from '../parserUtils';

export function parseTtStocks(
  stocksBuffer: Buffer,
  mappingPath: string,
  thresholdConfig: ThresholdValue,
): StockRow[] {
  const stocksWorkbook = readWorkbookBuffer(stocksBuffer);
  const stocksData = sheetToMatrix(stocksWorkbook);

  const poplinRowIndex = stocksData.findIndex(
    (element) => element.length === 1 && element[0] === 'Поплин',
  );
  const poplinStocks = poplinRowIndex !== -1 ? stocksData.slice(poplinRowIndex) : stocksData;
  const byazStocks = poplinRowIndex !== -1 ? stocksData.slice(0, poplinRowIndex) : stocksData;

  const mappingWorkBook = readWorkbookFile(mappingPath);
  const mappingSheet = mappingWorkBook.Sheets[TT_SHEETNAME];
  if (!mappingSheet) {
    throw new Error('Sheet not found');
  }

  const mappingData = sheetToMatrix(mappingWorkBook, TT_SHEETNAME);
  const filteredMappingData = mappingData.filter((row) => row[3] !== 0);

  return filteredMappingData.map((mappingValue) => {
    let valueMatch;

    if (mappingValue[0] && String(mappingValue[0]).includes('-BZ-')) {
      valueMatch = byazStocks.find(
        (stocksValue) =>
          stocksValue[2] && String(stocksValue[2]).trim() === String(mappingValue[1]).trim(),
      );
    } else if (mappingValue[0] && String(mappingValue[0]).includes('-PP-')) {
      valueMatch = poplinStocks.find(
        (stocksValue) =>
          stocksValue[2] && String(stocksValue[2]).trim() === String(mappingValue[1]).trim(),
      );
    } else {
      valueMatch = stocksData.find(
        (stocksValue) =>
          stocksValue[2] && String(stocksValue[2]).trim() === String(mappingValue[1]).trim(),
      );
    }

    const remain =
      valueMatch && valueMatch.length > 0 && stringToInt(valueMatch[3]) > thresholdConfig.threshold
        ? thresholdConfig.remain
        : 0;

    return [String(mappingValue[0]), mappingValue[2] as string | undefined, remain];
  });
}
