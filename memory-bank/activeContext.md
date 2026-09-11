# Active Context

## Focus
`stickers-sort-by-product-type` — сортировка PDF этикеток по типу товара.

## Change
Перед генерацией PDF этикетки сортируются: поставщик (ORDER_GROUP_KEYS) → отрез/рулон → артикул. LT-отрезы идут блоком, постельное белье — отдельным блоком.

## Files
- `backend/src/services/stickersSortService.ts` (new)
- `backend/src/services/ozonLabelsService.ts`
- `backend/src/services/wbLabelsService.ts`
