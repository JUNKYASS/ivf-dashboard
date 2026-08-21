# TASK ARCHIVE: Фильтрация `undefined` в Ozon-файле остатков

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `parser-ozon-undefined-filter` |
| **Дата** | 2026-08-19 |
| **Сложность** | Level 1 |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/parser` |

---

## SUMMARY

В `ozon-stocks.xlsx` колонка «Артикул» содержала строки `undefined` из-за `String(undefined)` в парсерах при пустом mapping. Строки с невалидным артикулом отфильтровываются в `toOzonRows()`.

---

## IMPLEMENTATION

| Файл | Изменения |
|------|-----------|
| `backend/src/services/parserUtils.ts` | `isValidStockArticle()`, фильтр в `toOzonRows` |

```typescript
const isValidStockArticle = (article: string | undefined): boolean => {
  if (article == null) return false;
  const normalized = String(article).trim();
  return normalized !== '' && normalized !== 'undefined';
};
```

---

## TESTING

| Проверка | Результат |
|----------|-----------|
| `npm run build` | ✅ |

---

## REFERENCES

- Reflection: `memory-bank/reflection/reflection-parser-ozon-undefined-filter.md`
