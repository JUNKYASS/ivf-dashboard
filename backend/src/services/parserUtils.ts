import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { WAREHOUSE_ID } from '../constants';
import type { OzonRow, StockRow, WbRow } from '../types';

export const stringToInt = (str: unknown): number => {
  if (str === null || str === undefined) return 0;
  return parseFloat(String(str).replace(/\s/g, ''));
};

export type SheetMatrix = unknown[][];

export const readWorkbookBuffer = (buffer: Buffer): XLSX.WorkBook =>
  XLSX.read(buffer, { type: 'buffer' });

export const readWorkbookFile = (filePath: string): XLSX.WorkBook => XLSX.readFile(filePath);

export const sheetToMatrix = (workbook: XLSX.WorkBook, sheetName?: string): SheetMatrix => {
  const name = sheetName ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1 }) as SheetMatrix;
};

export const writeOutputFiles = (
  ozonRows: OzonRow[],
  wbRows: WbRow[],
  ozonPath: string,
  wbPath: string,
): void => {
  fs.mkdirSync(path.dirname(ozonPath), { recursive: true });

  const ozonSheet = XLSX.utils.json_to_sheet(ozonRows);
  const ozonWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(ozonWb, ozonSheet, 'Результаты');
  XLSX.writeFile(ozonWb, ozonPath);

  const wbSheet = XLSX.utils.json_to_sheet(wbRows);
  const wbWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbWb, wbSheet, 'Результаты');
  XLSX.writeFile(wbWb, wbPath);
};

const isValidStockArticle = (article: string | undefined): boolean => {
  if (article == null) return false;
  const normalized = String(article).trim();
  return normalized !== '' && normalized !== 'undefined';
};

export const toOzonRows = (data: StockRow[]): OzonRow[] =>
  data
    .filter((item) => isValidStockArticle(item[0]))
    .map((item) => ({
      'Название склада (идентификатор склада)': WAREHOUSE_ID,
      Артикул: String(item[0]).trim(),
      'Название товара': '',
      'Доступно на складе, шт': item[2],
    }));

export const toWbRows = (data: StockRow[]): WbRow[] =>
  data
    .filter((item) => Boolean(item[1]))
    .map((item) => ({
      Баркод: String(item[1]),
      Количество: item[2],
    }));
