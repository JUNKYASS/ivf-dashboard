import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  BAND_HEIGHT_PT,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LABEL_HEIGHT_PT,
  LABEL_WIDTH_PT,
  composeLabelsFromSourcePdf,
  fitCaption,
  formatArticleCaption,
  mapCaptionsToPages,
  toWinAnsi,
} from './labelPdfService';

test('formatArticleCaption: one sku', () => {
  assert.equal(
    formatArticleCaption([{ article: 'GT-220120-BZ-33-Aquarelle', quantity: 1 }]),
    'GT-220120-BZ-33-Aquarelle',
  );
});

test('formatArticleCaption: qty > 1 uses xN', () => {
  assert.equal(
    formatArticleCaption([{ article: 'GT-220120-BZ-33-Aquarelle', quantity: 3 }]),
    'GT-220120-BZ-33-Aquarelle x3',
  );
});

test('formatArticleCaption: several skus joined by comma', () => {
  assert.equal(
    formatArticleCaption([
      { article: 'ART-A', quantity: 1 },
      { article: 'ART-B', quantity: 2 },
      { article: 'ART-C', quantity: 1 },
    ]),
    'ART-A, ART-B x2, ART-C',
  );
});

test('toWinAnsi replaces non-latin chars', () => {
  assert.equal(toWinAnsi('GT-Бязь'), 'GT-????');
});

test('mapCaptionsToPages zips equal counts', () => {
  assert.deepEqual(mapCaptionsToPages(['a', 'b'], 2), ['a', 'b']);
});

test('mapCaptionsToPages repeats caption when pages divide evenly', () => {
  assert.deepEqual(mapCaptionsToPages(['a', 'b'], 4), ['a', 'a', 'b', 'b']);
});

test('composeLabelsFromSourcePdf uses 58x40 page size', async () => {
  const source = await PDFDocument.create();
  const sourcePage = source.addPage([200, 200]);
  sourcePage.drawRectangle({ x: 20, y: 20, width: 80, height: 80 });
  const sourceBytes = await source.save();

  const outBytes = await composeLabelsFromSourcePdf(sourceBytes, ['GT-220120-BZ-33-Aquarelle']);
  const out = await PDFDocument.load(outBytes);
  const page = out.getPages()[0];
  assert.ok(page);
  const { width, height } = page.getSize();
  assert.ok(Math.abs(width - LABEL_WIDTH_PT) < 0.05);
  assert.ok(Math.abs(height - LABEL_HEIGHT_PT) < 0.05);
  assert.ok(BAND_HEIGHT_PT < height);
});

test('fitCaption keeps a typical article on one line', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = LABEL_WIDTH_PT - 2 * 1.5 * (72 / 25.4);
  const fitted = fitCaption('GT-220120-BZ-33-Aquarelle', font, maxWidth);
  assert.equal(fitted.lines.length, 1);
  assert.equal(fitted.size, FONT_SIZE_MAX);
});

test('fitCaption wraps multi-sku caption to at most 2 lines', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = LABEL_WIDTH_PT - 2 * 1.5 * (72 / 25.4);
  const caption = [
    'GT-220120-BZ-33-Aquarelle',
    'TD-PP-12-FooBarBaz',
    'AD-ST-8-SomethingLong',
    'TDL-BZ-50-AnotherOne',
  ].join(', ');
  const fitted = fitCaption(caption, font, maxWidth);
  assert.ok(fitted.lines.length <= 2);
  assert.ok(fitted.lines[0]);
});
