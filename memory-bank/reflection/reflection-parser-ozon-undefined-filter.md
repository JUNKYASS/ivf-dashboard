# Reflection: Фильтрация `undefined` в Ozon-файле остатков

**Task ID:** `parser-ozon-undefined-filter`  
**Дата:** 2026-08-19  
**Сложность:** Level 1  
**Статус:** REFLECT завершён

---

## Summary

В файле `ozon-stocks.xlsx` во 2-й колонке (`Артикул`) появлялись строки со значением `undefined`. Причина: парсеры вызывают `String(mappingValue[0])` при пустом артикуле в mapping. Фикс: центральная фильтрация в `toOzonRows()` по аналогии с `toWbRows()`.

---

## Solution

`isValidStockArticle()` отсекает `null`, пустые строки и буквальное `"undefined"` перед записью в Ozon Excel.

---

## Lessons Learned

Фильтрация на уровне `toOzonRows` / `toWbRows` надёжнее, чем правки в каждом парсере отдельно.
