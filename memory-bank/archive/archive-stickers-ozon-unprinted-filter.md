# TASK ARCHIVE: Stickers — нераспечатанные + split UI

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `stickers-ozon-unprinted-filter` |
| **Дата** | 2026-09-04 |
| **Сложность** | Level 2 |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/stickers` |
| **Родитель** | `stickers-label-generation` (ARCHIVED 2026-08-25) |

---

## SUMMARY

Расширение `/stickers`: блоки **Ozon** и **Wildberries**, в каждом кнопки **«Все этикетки»** и **«Нераспечатанные»**. Учёт скачиваний — локальный JSON (`printed-labels.json`), не кабинет МП.

Live probe Ozon: API **не отдаёт** признак «этикетка скачана в ЛК» (`70679248-0294-7` vs `0115312846-0111-1` — идентичные `status`/`available_actions`). Локальный store — единственный рабочий путь.

REFLECT amend: TTL 45 дней + prune по eligible list; имя PDF с датой/временем.

---

## REQUIREMENTS

1. Split UI Ozon / WB (не одна строка кнопок).
2. Кнопка «Нераспечатанные» для **обоих** МП.
3. Изначально — статус из кабинета Ozon; после probe → локальный учёт с disclaimer.
4. Не раздувать JSON бесконечно.
5. Имя скачиваемого PDF с датой/временем генерации.

---

## IMPLEMENTATION

### API

```
POST /api/marketplace/stickers/ozon?scope=all|unprinted
POST /api/marketplace/stickers/wb?scope=all|unprinted
```

400: нет нераспечатанных / нет заказов / нет кредов.

### Локальный учёт (`printedLabelsService.ts`)

- Файл: `backend/storage/printed-labels.json`
- Ключи: Ozon `posting_number`, WB `orderId` (string)
- `markPrinted` — после успешного PDF, только `printedIds` (не `skipped`)
- **Prune eligible** — при generate удаляются ID не в текущем списке заказов
- **TTL 45 дней** — `pruneExpiredEntries` на mark/prune; expired снова «нераспечатанные»

### Labels services

- `ozonLabelsService` / `wbLabelsService`: `scope`, filter, `printedIds[]`
- `stickersService`: orchestration + `markPrinted` после PDF

### Frontend

- `StickersPage`: 2 блока, 4 кнопки, loading `ozon-all` | `ozon-unprinted` | `wb-all` | `wb-unprinted`
- `buildStickersFilename()`: `ozon-labels-unprinted-2026-09-04_14-30.pdf` (локальное время)
- Hint: кабинет МП не учитывается

### Файлы

| Файл | Изменение |
|------|-----------|
| `backend/src/services/printedLabelsService.ts` | **новый** — store, TTL, prune |
| `backend/src/services/printedLabelsService.test.ts` | **новый** — 5 tests |
| `backend/src/services/ozonLabelsService.ts` | scope, printedIds |
| `backend/src/services/wbLabelsService.ts` | scope, printedIds |
| `backend/src/services/stickersService.ts` | scope, mark |
| `backend/src/services/stickersShared.ts` | `StickersScope`, `parseStickersScope` |
| `backend/src/routes/marketplace.ts` | query `scope` |
| `frontend/src/pages/StickersPage.tsx` | split UI |
| `frontend/src/api/client.ts` | scope, filename |
| `frontend/src/styles/global.css` | `.stickers-marketplace-block` |
| `docs/features/stickers.md` | scope, TTL, filename |

Не трогали: `ozonOrdersService`, `wbOrdersService`, `labelPdfService`.

---

## API RESEARCH (Ozon)

| posting | В ЛК Ozon | API `status` | `label_download` |
|---------|-----------|--------------|------------------|
| `70679248-0294-7` | скачана | `awaiting_deliver` | есть |
| `0115312846-0111-1` | не скачивалась | `awaiting_deliver` | есть |

Гипотеза «статус меняется после печати» — **опровергнута** (оба `posting_transferring_to_delivery`).

---

## TESTING

| Проверка | Результат |
|----------|-----------|
| Unit `printedLabelsService` | ✅ 5 tests |
| Unit existing (labelPdf, wb) | ✅ |
| **Total backend** | **18/18** |
| FE/BE `npm run build` | ✅ |
| Live unprinted flow | не проверено оператором |

---

## LESSONS LEARNED

1. Ozon ЛК «скачано» ≠ Seller API — probe на реальных posting до BUILD.
2. `status`/`substatus` не про печать этикетки; ship → `awaiting_deliver`.
3. JSON store нужен TTL, не только prune по eligible.
4. Симметрия Ozon/WB в одном сервисе — меньше дублирования.
5. REFLECT amend (TTL, filename) до archive — нормальный цикл.

---

## FOLLOW-UP (не в задаче)

- Ручная проверка unprinted flow на складе
- Кнопка «Сбросить учёт»
- `Content-Disposition` filename на backend

---

## REFERENCES

- Reflection: `memory-bank/reflection/reflection-stickers-ozon-unprinted-filter.md`
- Creative: `memory-bank/creative/creative-stickers-unprinted-local.md`
- Parent archive: `memory-bank/archive/archive-stickers-label-generation.md`
- Docs: `docs/features/stickers.md`
