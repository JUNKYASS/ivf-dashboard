export type ClipboardPayload = {
  text: string;
  html?: string;
};

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
  const container = document.createElement('div');
  container.contentEditable = 'true';
  container.innerHTML = html;
  container.setAttribute('readonly', '');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const copied = document.execCommand('copy');
  document.body.removeChild(container);
  selection?.removeAllRanges();

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
          'text/html': new Blob([html], { type: 'text/html' }),
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
