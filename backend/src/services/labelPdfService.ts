import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';

const MM = 72 / 25.4;

export const LABEL_WIDTH_PT = 58 * MM;
export const LABEL_HEIGHT_PT = 40 * MM;
export const BAND_HEIGHT_PT = 9 * MM;
export const PAGE_INSET_PT = 1 * MM;
export const BAND_PAD_X_PT = 1.5 * MM;
export const FONT_SIZE_MAX = 8;
export const FONT_SIZE_MIN = 6;
export const MAX_LINES = 2;
export const HAIRLINE_PT = 0.4;

export type CaptionItem = {
  article: string;
  quantity: number;
};

export function formatArticleCaption(items: CaptionItem[]): string {
  return items
    .map((item) => {
      const article = item.article.trim();
      if (!article) return '';
      const quantity = item.quantity > 0 ? item.quantity : 1;
      return quantity > 1 ? `${article} x${quantity}` : article;
    })
    .filter(Boolean)
    .join(', ');
}

export function toWinAnsi(text: string): string {
  return [...text].map((ch) => (ch.charCodeAt(0) > 255 ? '?' : ch)).join('');
}

export function mapCaptionsToPages(captions: string[], pageCount: number): string[] {
  if (pageCount <= 0) return [];
  if (captions.length === 0) return Array.from({ length: pageCount }, () => '');
  if (pageCount === captions.length) return captions;
  if (pageCount % captions.length === 0) {
    const per = pageCount / captions.length;
    return captions.flatMap((caption) => Array.from({ length: per }, () => caption));
  }
  return Array.from({ length: pageCount }, (_, index) => {
    const mappedIndex = Math.min(
      Math.floor((index * captions.length) / pageCount),
      captions.length - 1,
    );
    return captions[mappedIndex] ?? '';
  });
}

export function fitCaption(
  caption: string,
  font: PDFFont,
  maxWidth: number,
): { size: number; lines: string[] } {
  const text = toWinAnsi(caption.trim());
  const tokens = tokenizeCaption(text);
  if (tokens.length === 0) return { size: FONT_SIZE_MAX, lines: [] };

  for (let size = FONT_SIZE_MAX; size >= FONT_SIZE_MIN - 0.01; size -= 0.5) {
    const lines = packTokens(tokens, font, size, maxWidth);
    if (lines.length <= MAX_LINES) return { size, lines };
  }

  const packed = packTokens(tokens, font, FONT_SIZE_MIN, maxWidth);
  if (packed.length <= MAX_LINES) return { size: FONT_SIZE_MIN, lines: packed };

  const rest = packed.slice(1).join(', ');
  return {
    size: FONT_SIZE_MIN,
    lines: [
      packed[0] ?? '',
      truncateWithEllipsis(rest, font, FONT_SIZE_MIN, maxWidth),
    ],
  };
}

export async function composeLabelsFromSourcePdf(
  sourcePdfBytes: Uint8Array,
  captions: string[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  await appendPdfSource(doc, font, sourcePdfBytes, captions);
  return doc.save();
}

export async function composeLabelsFromPngs(
  items: Array<{ pngBytes: Uint8Array; caption: string }>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const item of items) {
    await appendPngSource(doc, font, item.pngBytes, item.caption);
  }
  return doc.save();
}

export async function createLabelsDocument(): Promise<{
  doc: PDFDocument;
  font: PDFFont;
}> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, font };
}

export async function appendPdfSource(
  doc: PDFDocument,
  font: PDFFont,
  sourcePdfBytes: Uint8Array,
  captions: string[],
): Promise<void> {
  const source = await PDFDocument.load(sourcePdfBytes);
  const sourcePages = source.getPages();
  if (sourcePages.length === 0) return;

  const embeddedPages = await doc.embedPages(sourcePages);
  const pageCaptions = mapCaptionsToPages(captions, embeddedPages.length);

  for (let i = 0; i < embeddedPages.length; i += 1) {
    const embedded = embeddedPages[i];
    if (!embedded) continue;
    const page = doc.addPage([LABEL_WIDTH_PT, LABEL_HEIGHT_PT]);
    drawContained(page, embedded.width, embedded.height, (box) => {
      page.drawPage(embedded, box);
    });
    drawArticleBand(page, font, pageCaptions[i] ?? '');
  }
}

export async function appendPngSource(
  doc: PDFDocument,
  font: PDFFont,
  pngBytes: Uint8Array,
  caption: string,
): Promise<void> {
  const image = await doc.embedPng(pngBytes);
  const page = doc.addPage([LABEL_WIDTH_PT, LABEL_HEIGHT_PT]);
  drawContained(page, image.width, image.height, (box) => {
    page.drawImage(image, box);
  });
  drawArticleBand(page, font, caption);
}

function tokenizeCaption(caption: string): string[] {
  return caption
    .split(/,\s*/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function packTokens(tokens: string[], font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';

  for (const token of tokens) {
    if (font.widthOfTextAtSize(token, size) > maxWidth) {
      if (current) {
        lines.push(current);
        current = '';
      }
      const broken = hardBreak(token, font, size, maxWidth);
      lines.push(...broken.slice(0, -1));
      current = broken[broken.length - 1] ?? '';
      continue;
    }

    const next = current ? `${current}, ${token}` : token;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = token;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function hardBreak(token: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';

  for (const ch of token) {
    const next = current + ch;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current);
      current = ch;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [token];
}

function truncateWithEllipsis(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const ellipsis = '...';
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;

  let cut = text;
  while (cut.length > 0 && font.widthOfTextAtSize(cut + ellipsis, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}${ellipsis}`;
}

function containRect(origW: number, origH: number): { x: number; y: number; width: number; height: number } {
  const availW = LABEL_WIDTH_PT - 2 * PAGE_INSET_PT;
  const availH = LABEL_HEIGHT_PT - BAND_HEIGHT_PT - PAGE_INSET_PT;
  const scale = Math.min(availW / Math.max(origW, 1), availH / Math.max(origH, 1));
  const width = origW * scale;
  const height = origH * scale;
  return {
    x: (LABEL_WIDTH_PT - width) / 2,
    y: BAND_HEIGHT_PT + (availH - height) / 2,
    width,
    height,
  };
}

function drawContained(
  page: PDFPage,
  origW: number,
  origH: number,
  draw: (box: { x: number; y: number; width: number; height: number }) => void,
): void {
  draw(containRect(origW, origH));
}

function drawArticleBand(page: PDFPage, font: PDFFont, caption: string): void {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: LABEL_WIDTH_PT,
    height: BAND_HEIGHT_PT,
    color: rgb(1, 1, 1),
  });

  page.drawLine({
    start: { x: 0, y: BAND_HEIGHT_PT },
    end: { x: LABEL_WIDTH_PT, y: BAND_HEIGHT_PT },
    thickness: HAIRLINE_PT,
    color: rgb(0, 0, 0),
  });

  const maxWidth = LABEL_WIDTH_PT - 2 * BAND_PAD_X_PT;
  const { size, lines } = fitCaption(caption, font, maxWidth);
  if (lines.length === 0) return;

  const lineHeight = size * 1.15;
  const block = size + (lines.length - 1) * lineHeight;
  let y = (BAND_HEIGHT_PT - block) / 2 + (lines.length - 1) * lineHeight;

  for (const line of lines) {
    page.drawText(line, {
      x: BAND_PAD_X_PT,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }
}
