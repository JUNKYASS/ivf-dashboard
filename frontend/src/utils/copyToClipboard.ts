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

/**
 * HTTP / non-secure context: navigator.clipboard.write недоступен.
 * Явно пишем text/html в copy-event — иначе execCommand копирует только plain text.
 */
function copyRichTextFallback(text: string, html: string): boolean {
  const container = document.createElement('div');
  container.contentEditable = 'true';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.opacity = '0';
  container.textContent = text;
  document.body.appendChild(container);

  const selection = window.getSelection();
  if (!selection) {
    document.body.removeChild(container);
    return copyPlainText(text);
  }

  const range = document.createRange();
  range.selectNodeContents(container);
  selection.removeAllRanges();
  selection.addRange(range);

  const htmlPayload = toClipboardHtmlDocument(html);

  const onCopy = (event: ClipboardEvent) => {
    event.clipboardData?.setData('text/plain', text);
    event.clipboardData?.setData('text/html', htmlPayload);
    event.preventDefault();
  };

  document.addEventListener('copy', onCopy);
  const copied = document.execCommand('copy');
  document.removeEventListener('copy', onCopy);
  selection.removeAllRanges();
  document.body.removeChild(container);

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
          'text/html': new Blob([toClipboardHtmlDocument(html)], { type: 'text/html;charset=utf-8' }),
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
