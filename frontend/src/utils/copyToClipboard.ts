export type ClipboardPayload = {
  text: string;
  html?: string;
};

/** Только цвет текста — без background, иначе Word/Excel тащат highlight или чёрный фон страницы. */
const CLIPBOARD_TEXT_COLOR = '#000000';

function styledClipboardFragment(html: string): string {
  return `<span style="color:${CLIPBOARD_TEXT_COLOR}">${html}</span>`;
}

function toClipboardHtmlDocument(html: string): string {
  return (
    `<html><head><meta charset="utf-8"></head>` +
    `<body>` +
    `<!--StartFragment-->${styledClipboardFragment(html)}<!--EndFragment-->` +
    `</body></html>`
  );
}

function copyPlainText(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}

function copyRichTextFallback(text: string, html: string): boolean {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return copyPlainText(text);
  }

  doc.open();
  doc.write('<!DOCTYPE html><html><body></body></html>');
  doc.close();

  const span = doc.createElement('span');
  span.style.color = CLIPBOARD_TEXT_COLOR;
  span.innerHTML = html;
  doc.body.appendChild(span);

  const selection = doc.getSelection();
  const range = doc.createRange();
  range.selectNodeContents(span);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const copied = doc.execCommand('copy');
  document.body.removeChild(iframe);

  if (!copied) {
    return copyPlainText(text);
  }

  return true;
}

/**
 * Копирование в буфер с fallback для HTTP (без secure context navigator.clipboard недоступен).
 * html — опционально, для жирного и прочего форматирования при вставке в Word / Excel / Docs.
 */
export async function copyToClipboard(payload: string | ClipboardPayload): Promise<void> {
  const text = typeof payload === 'string' ? payload : payload.text;
  const html = typeof payload === 'string' ? undefined : payload.html;

  if (html && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([toClipboardHtmlDocument(html)], { type: 'text/html' }),
        }),
      ]);
      return;
    } catch {
      // fallback ниже
    }
  }

  if (html) {
    if (copyRichTextFallback(text, html)) return;
    throw new Error('Не удалось скопировать в буфер обмена');
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fallback ниже
    }
  }

  if (!copyPlainText(text)) {
    throw new Error('Не удалось скопировать в буфер обмена');
  }
}
