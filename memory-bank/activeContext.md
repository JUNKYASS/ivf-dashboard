# Memory Bank: Active Context

## Текущий фокус
`stickers-label-generation` — Level 3 REFLECT done. Next: ARCHIVE.

## Режим
REFLECT complete.

## Caption follow-up (не в этом цикле)
3 длинных SKU на 6pt/2 строки: третий режется `...`. 1 SKU = 8pt — поэтому кегль кажется крупным. Фикс если надо: FONT_SIZE_MIN ~4.5 или MAX_LINES=3.

## Post-reflect fix
WB: не `supplierStatus===confirm` в одиночку. Нужны `confirm` + `wbStatus===waiting` + непустой `supplyId`. Иначе в PDF попадает отменённый клиентом заказ (CHN-150230-OXF600D-10-n-18e-les, 2 авг).

## Припарковано
`copy-articles-clipboard-color` — untracked `copyToClipboard.ts`
