# TASK ARCHIVE: Генерация стикеров Ozon/WB 58×40

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `stickers-label-generation` |
| **Дата начала** | 2026-08-25 |
| **Дата архивации** | 2026-08-25 |
| **Сложность** | Level 3 |
| **Тип** | Feature |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/stickers` |
| **Commit** | `f4c6ba0` (плюс локальные amends layout/WB-filter после коммита) |

---

## SUMMARY

Страница `/stickers` качает один PDF на маркетплейс: оригинальная этикетка Ozon/WB сжата contain в верхние ~32.5 мм, маркетплейсный артикул в нижней полосе 6.5 мм. Страница PDF ровно **58×40 мм**. Цель — наклеить стикер на нужный товар и не перепутать SKU.

Ozon: FBS `awaiting_deliver` + sync `package-label` PDF.  
WB: нет PDF-стикеров → PNG 58×40 → `pdf-lib`. Фильтр сборки: `supplierStatus=confirm` + `wbStatus=waiting` + непустой `supplyId`.

Live: Ozon 27 стр. MediaBox 58.00×40.00 мм; WB 4 этикетки после отсечения призрака `canceled_by_client`.

---

## REQUIREMENTS

### Functional (закрыто)

1. Артикул **маркетплейсный** (напр. `GT-220120-BZ-33-Aquarelle`). Mapping/поставщик не печатаем.
2. Оригинал **сжимается**, снизу полоса. Overlay нет.
3. Одна этикетка = одно отправление. Несколько SKU → через запятую. Qty>1 → ` xN` (не `x1`).
4. Ozon: `awaiting_deliver` («Готово к отгрузке»), **не** `/orders` `awaiting_packaging`.
5. WB: «на сборке», **не** `/api/v3/orders/new`.
6. Каждая страница выходного PDF = 58×40 мм.
7. Два кнопки, один PDF на МП (`ozon-labels.pdf` / `wb-labels.pdf`). Нет превью/zip/combined.
8. Частичный фейл: успешные в PDF, пропущенные в `X-Stickers-Skipped`. 0 успеха → 400.

### Non-functional (закрыто)

- Креды те же (`marketplaceEnvService`). Формы ключей на `/stickers` нет.
- Не трогать `ozonOrdersService` / `wbOrdersService` / `ordersService`.
- Timeout генерации ≥ 180s (axios + Vite proxy + frontend fetch).
- HelveticaBold (ASCII артикулы; кириллица → `?`).
- UI русский, `clay-card` / `clay-btn` как `/orders`.

### Caption

```
qty === 1 → "GT-220120-BZ-33-Aquarelle"
qty > 1  → "GT-220120-BZ-33-Aquarelle x3"
несколько → "ART-A, ART-B x2, ART-C"
```

WB FBS ≈ 1 SKU на сборочное задание.

---

## DESIGN DECISIONS

Источник: `memory-bank/creative/creative-stickers-pdf-layout.md`

| Решение | Итог |
|---------|------|
| Layout | Option 2 (фиксированная полоса, wrap ≤2, left, uniform contain) |
| Amend post-BUILD | Полоса **6.5 мм** (было 9), кегль **5.5→4.5pt** (было 8→6), оригинал ~32.5 мм — читаемость штрихкода |
| Rejected | Тонкая полоса + ellipsis; адаптивная высота (скачет на рулоне); stretch (ломает barcode); overlay |
| WB labels | PNG 58×40 → `embedPng`. PDF у WB только у cross-border |
| PDF lib | `pdf-lib` на backend. Не puppeteer, не pdfkit, не фронтовый pdf-lib |
| Architecture | Отдельные `*LabelsService`. CREATIVE UI skip — паттерн `/orders` |

Константы (`labelPdfService.ts`): `BAND_HEIGHT_PT = 6.5mm`, `FONT_SIZE_MAX = 5.5`, `FONT_SIZE_MIN = 4.5`, `MAX_LINES = 2`, inset 1 мм, hairline 0.4pt.

---

## IMPLEMENTATION

### Approach

`StickersPage` → `POST /api/marketplace/stickers/{ozon|wb}` (blob) → `stickersService.generate(mp)`:

1. Список отправлений нужного статуса + caption per posting/order.
2. Скачать оригиналы (Ozon PDF батчи ≤20; WB PNG ≤100).
3. `labelPdfService` собирает страницы 58×40 в памяти, без файла на диск.

### Key components

| Файл | Роль |
|------|------|
| `backend/src/services/labelPdfService.ts` | 58×40 compose, `formatArticleCaption`, wrap/shrink, contain |
| `backend/src/services/labelPdfService.test.ts` | caption, page size, wrap |
| `backend/src/services/ozonLabelsService.ts` | `awaiting_deliver` + `/v2/posting/fbs/package-label`, retry singles |
| `backend/src/services/wbLabelsService.ts` | 30д orders + status + PNG stickers; `isWbOrderOnAssembly` |
| `backend/src/services/wbLabelsService.test.ts` | фильтр confirm+waiting+supplyId |
| `backend/src/services/stickersService.ts` | оркестрация + креды |
| `backend/src/services/stickersShared.ts` | shared types / errors |
| `backend/src/routes/marketplace.ts` | `POST /marketplace/stickers/ozon`, `.../wb` |
| `frontend/src/pages/StickersPage.tsx` | кнопки «Этикетки Ozon/WB», hint печати |
| `frontend/src/api/client.ts` | `generateStickers` blob download |
| `docs/features/stickers.md` | операторская дока |

### Не трогали

`ozonOrdersService.ts`, `wbOrdersService.ts`, `ordersService.ts`, `OrdersSettingsBlock`.

### API

```
POST /api/marketplace/stickers/ozon
POST /api/marketplace/stickers/wb
→ 200 application/pdf
  Content-Disposition: attachment; filename="{mp}-labels.pdf"
  X-Stickers-Count: N
  X-Stickers-Skipped: ids (csv, optional)
→ 400 { error }  нет кредов / 0 этикеток / нет заказов
```

CORS: `exposedHeaders` для `X-Stickers-*`. Vite proxy timeout 180s.

### Ozon

1. `POST /v3/posting/fbs/list` `status: awaiting_deliver`, 30д, `has_next`.
2. Caption из `products[]`: `{ offer_id, quantity }`.
3. `posting_number` сырой, без префикса `OZN`.
4. `POST /v2/posting/fbs/package-label` ≤20. Битый батч → retry по одному.
5. `"The next postings aren't ready"` → wait 5s, retry 3×, потом skip.
6. `pageCount !== n` → caption на каждую страницу группы, не ронять PDF.

### WB

1. `GET /api/v3/orders?limit=1000` 30д. Курсор `next` парсить **строкой** из raw JSON (`Number` > `MAX_SAFE_INTEGER` → inf-loop → 429).
2. Пауза 250ms между страницами.
3. `POST /api/v3/orders/status` → `isWbOrderOnAssembly`: **confirm + waiting + non-empty supplyId**.
4. `POST /api/v3/orders/stickers?type=png&width=58&height=40` ≤100.
5. Axios 429/ошибки → `StickersError` без дампа `Authorization` в лог.

Ghost case: заказ `CHN-150230-OXF600D-10-n-18e-les` (`5414910358`) — `supplierStatus=confirm`, `wbStatus=canceled_by_client`, пустой `supplyId`. Stickers API всё ещё отдаёт PNG → фильтр **до** fetch.

### PDF layout (финал)

```
58 mm
┌──────────────────────────────────────┐
│     Ozon/WB label CONTAIN ~32.5 мм   │
│──────────────────────────────────────│ hairline
│ GT-220120-BZ-33-Aquarelle            │ 6.5 мм, 5.5→4.5pt, ≤2 lines
└──────────────────────────────────────┘
40 mm
```

Page size pt: `58 * 72/25.4 ≈ 164.41`, `40 * 72/25.4 ≈ 113.39`.

---

## TESTING

| Проверка | Результат |
|----------|-----------|
| Unit `labelPdfService` (caption, page size, wrap) | ✅ |
| Unit `isWbOrderOnAssembly` (confirm+waiting, cancel, empty supply) | ✅ |
| `npm run test -w backend` | ✅ |
| FE/BE `npm run build` | ✅ |
| Live Ozon | 27 этикеток, MediaBox 58.00×40.00 мм |
| Live WB | 4 PDF после фильтра призрака (было 5 с CHN-…) |
| `/api/marketplace/orders/fetch` регрессия | 200 |
| Browser click UI | нет browser tools; UI через Vite + API |
| Ручная термопечать 58×40 @ 100% | **не сделана** (оператор) |

Нет unit «3 длинных SKU полностью видны» — worst-case всё ещё ellipsis на строке 2 (см. Known issues).

---

## LESSONS LEARNED

Критичное (из reflection):

1. Marketplace cursor часто int64. `JSON.parse` без bigint → тихий inf-loop + 429.
2. `supplierStatus=confirm` ≠ «на сборке». Нужен `wbStatus=waiting` + `supplyId`. Stickers API отдаёт PNG для leftover confirm.
3. HelveticaBold: 1 типичный SKU = одна строка; 3 длинных GT/TD на 2 строках режутся. CREATIVE надо гонять на реальных артикулах, не на `'A, B, C'`.
4. `pdf-lib` не эмбедит страницу без Contents stream.
5. Не `console.error` raw axios — JWT в терминале.
6. Live API в BUILD дешевле синтетических моков этикеток.
7. Отдельные `*LabelsService` спасли `/orders`.

Process: L3 = PLAN lock + один CREATIVE (layout) — правильный объём. VAN QA skip ок.

Полный текст: `memory-bank/reflection/reflection-stickers-label-generation.md`.

---

## KNOWN ISSUES / FOLLOW-UP

- **3 длинных SKU** в одном отправлении: строка 2 может уйти в `...`. Лечение: `FONT_SIZE_MIN` ещё ниже или `MAX_LINES=3` в тех же 6.5 мм. Редкость для ткани FBS.
- **Термопечать** 58×40 @ 100% — ручная проверка у оператора (fit-to-page растянет).
- Кириллица в SKU → `?` (Helvetica WinAnsi). Follow-up: fontkit/TTF если появятся.
- Ozon шаблон 75×120: contain сожмёт штрихкод; hint «в кабинете формат 58×40».
- Припарковано вне этой задачи: `copy-articles-clipboard-color` (`frontend/src/utils/copyToClipboard.ts` untracked).

---

## REFERENCES

- Reflection: `memory-bank/reflection/reflection-stickers-label-generation.md`
- Creative: `memory-bank/creative/creative-stickers-pdf-layout.md`
- Feature docs: `docs/features/stickers.md`
- Tech: `memory-bank/techContext.md` (stickers endpoints)
- Product: `memory-bank/productContext.md` (`/stickers`)
- Code: `backend/src/services/labelPdfService.ts`, `ozonLabelsService.ts`, `wbLabelsService.ts`, `stickersService.ts`
- UI: `frontend/src/pages/StickersPage.tsx`
