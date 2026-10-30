# Reflection: orders-ym-assembly-filter

**Task ID:** `orders-ym-assembly-filter`  
**Дата:** 2026-10-30  
**Сложность:** Level 1  
**Статус:** REFLECT

---

## Summary

Фильтр YM на «Получение заказов» выровнен со стикерами: `PROCESSING` + client-side `STARTED` | `READY_TO_SHIP`. Общая логика в `ymOrderFilter.ts`.

---

## Changes

- `ymOrderFilter.ts` — `buildYmFbsOrdersListRequestBody`, `isYmFbsAssemblyEligible`
- `ymOrdersService.ts` — без `substatuses` в API, фильтр как у stickers
- `ymLabelsService.ts` — импорт из shared модуля

---

## Lesson

Один источник правды для assembly-среза YM: orders и stickers не расходятся.
