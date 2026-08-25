# Task: stickers-label-generation

## Description
Страница `/stickers`: скачать PDF этикеток Ozon/WB 58×40 мм с маркетплейсным артикулом в нижней полосе (оригинал сжат). Цель — наклеить на нужный товар и не перепутать.

## Complexity
Level: **3** — Intermediate Feature  
VAN → PLAN → CREATIVE (PDF layout) → BUILD → REFLECT

## Status
- [x] Initialization (VAN)
- [x] Planning (PLAN)
- [x] Creative: PDF layout → `memory-bank/creative/creative-stickers-pdf-layout.md`
- [x] VAN QA skipped (optional)
- [x] Implementation
- [x] Reflection → `memory-bank/reflection/reflection-stickers-label-generation.md`
- [ ] Archive

---

## Locked decisions (VAN + user PLAN answers)

| # | Решение |
|---|---------|
| 1 | Артикул **маркетплейсный**, напр. `GT-220120-BZ-33-Aquarelle`. Mapping/поставщик не печатаем. |
| 2 | Оригинал **сжимается**, снизу полоса с артикулом. Overlay по оригиналу — нет. |
| 3 | **Одна этикетка = одно отправление.** Несколько SKU → через запятую. Qty>1 → суффикс ` xN` (не `x1`). |
| 4 | WB **не отдаёт PDF**. Самый простой рабочий путь: `POST /api/v3/orders/stickers?type=png&width=58&height=40` → PNG base64 → `pdf-lib.embedPng`. «Редактировать PDF от WB» нельзя — его нет (PDF только у cross-border). |

### Caption

```
qty === 1 → "GT-220120-BZ-33-Aquarelle"
qty > 1  → "GT-220120-BZ-33-Aquarelle x3"
несколько → "ART-A, ART-B x2, ART-C"
```

WB FBS: одно сборочное задание = 1 SKU, qty фактически 1 → почти всегда просто article.

---

## Requirements

### Functional
- [x] Ozon: FBS `awaiting_deliver` («Готово к отгрузке»), не `awaiting_packaging` с `/orders`
- [x] Ozon: `POST /v2/posting/fbs/package-label` (sync PDF, ≤20 posting_number). При ошибке батча — retry по одному
- [x] WB: `supplierStatus === confirm` («На сборке»). Не `/orders/new`
- [x] WB: stickers PNG 58×40, собрать PDF самим
- [x] Каждая страница выходного PDF = 58×40 мм
- [x] Скачивание одного PDF на маркетплейс (`ozon-labels.pdf` / `wb-labels.pdf`)
- [x] Частичный фейл: успешные этикетки в PDF, пропущенные — в статусе. 0 успеха → 400

### Non-functional
- [ ] Креды те же (`marketplaceEnvService`). Форму ключей на `/stickers` не дублировать
- [ ] Не ломать `/orders` сервисы — отдельные `*LabelsService`
- [ ] Timeout генерации ≥ 180s (axios + frontend fetch)
- [ ] Helvetica: артикулы ASCII. Кириллица в SKU — риск (см. Challenges)
- [ ] UI: русский, `clay-card` / `clay-btn` / empty-state как `/orders`

---

## Technology Stack

- Framework: Express 5 + React 18/19 (как есть)
- Language: TypeScript
- PDF: **`pdf-lib`** (backend). `embedPdf` (Ozon) + `embedPng` (WB) + `addPage([w,h])` + `drawText`
- HTTP: axios `responseType: 'arraybuffer'` для Ozon PDF
- Storage: in-memory buffer, без файла на диск
- Font: StandardFonts.HelveticaBold (без fontkit/TTF в v1)

### Technology Validation

| Check | Status |
|-------|--------|
| Stack defined | YES — существующий + pdf-lib |
| Init command | `npm install pdf-lib -w backend` (BUILD) |
| Deps identified | `pdf-lib` only |
| PoC pattern (docs) | YES — `embedPdf` / `embedPng` / custom page size |
| Installed / test build | BUILD, не PLAN |

Page size (pt): `58 * 72/25.4 ≈ 164.41`, `40 * 72/25.4 ≈ 113.39`.

**Не брать:** puppeteer, pdfkit (нет embed существующего PDF), фронтовый pdf-lib (секреты API на сервере).

---

## Component analysis

```
StickersPage
  └─ POST /api/marketplace/stickers/:mp  (blob PDF)
        └─ stickersService.generate(mp)
              ├─ ozonLabelsService
              │    list awaiting_deliver → caption per posting → package-label batches
              ├─ wbLabelsService
              │    GET /api/v3/orders (30д) → POST /orders/status → filter confirm
              │    → POST /orders/stickers png 58x40 (≤100)
              └─ labelPdfService
                   compose 58×40 page: scaled original + bottom caption
```

### New
| Файл | Роль |
|------|------|
| `backend/src/services/labelPdfService.ts` | 58×40 compose + `formatArticleCaption` |
| `backend/src/services/ozonLabelsService.ts` | list + package-label |
| `backend/src/services/wbLabelsService.ts` | confirm + stickers PNG |
| `backend/src/services/stickersService.ts` | оркестрация + креды |

### Affected
| Файл | Изменение |
|------|-----------|
| `backend/src/routes/marketplace.ts` | `POST /marketplace/stickers/ozon`, `.../wb` |
| `backend/package.json` | `pdf-lib` |
| `frontend/src/pages/StickersPage.tsx` | UI вместо заглушки |
| `frontend/src/api/client.ts` | `generateStickers(mp)` → blob download |
| `frontend/src/styles/global.css` | минимум, если кнопки/статус не влезут в существующие классы |
| `memory-bank/techContext.md`, `docs/features/stickers.md` | после BUILD |

### Не трогать
`ozonOrdersService.ts`, `wbOrdersService.ts`, `ordersService.ts`, `OrdersSettingsBlock`.

---

## API plan

### Ozon
1. `POST /v3/posting/fbs/list` `status: awaiting_deliver`, since/to 30д, paginate `has_next` (как orders, другой статус)
2. Caption из `products[]`: `{ offer_id, quantity }`
3. `posting_number` в label API — **сырой**, без префикса `OZN`
4. `POST /v2/posting/fbs/package-label` `{ posting_number: [...] }` ≤20, `Accept`/arraybuffer
5. Маппинг страница↔posting: порядок запроса = порядок страниц. Если `pageCount !== n` — caption на каждую страницу группы (не ронять весь PDF)
6. `"The next postings aren't ready"` → wait 5s, retry 3×, потом skip

Async create/get — только если sync стабильно мрёт. Не v1.

### WB
1. `GET /api/v3/orders?limit=1000&next=0&dateFrom=<unix-30d>` пагинация пока `next > 0`
   - Этот метод **без статуса**. Нужен шаг 2.
2. `POST /api/v3/orders/status` `{ orders: ids }` чанками → `supplierStatus === 'confirm'`
3. Стикеры только для `confirm` (и `complete`, но complete не берём)
4. `POST /api/v3/orders/stickers?type=png&width=58&height=40` `{ orders: ids }` ≤100
5. `stickers[].file` base64 + `orderId` → article из шага 1

Rate: 300/min, interval 200ms — между батчами `await sleep(250)`.

### HTTP (наш)
```
POST /api/marketplace/stickers/ozon
POST /api/marketplace/stickers/wb
→ 200 application/pdf
  Content-Disposition: attachment; filename="{mp}-labels.pdf"
  X-Stickers-Count: N
  X-Stickers-Skipped: postingOrOrderIds (csv, optional)
→ 400 { error }  нет кредов / 0 этикеток / нет заказов
```

Frontend: `fetch` blob, `URL.createObjectURL`, скачать. CORS: `exposedHeaders` для X-Stickers-* (или просто показать «скачано N» по факту blob).

---

## Implementation plan

1. [x] Caption + PDF core (`labelPdfService.ts`)
2. [x] `pdf-lib` installed
3. [x] Ozon labels + route
4. [x] WB labels + route (`next` как string — JSON number > MAX_SAFE_INTEGER; пауза 250ms)
5. [x] StickersPage UI
6. [x] `docs/features/stickers.md` + techContext
7. [x] Verify: unit 9/9, FE/BE build, live Ozon 27×58×40, live WB 5 PDF, `/orders/fetch` OK

UI lock (без отдельного CREATIVE):
- Заголовок «Генерация стикеров»
- Одна `clay-card`: кнопки «Этикетки Ozon» / «Этикетки WB»
- Подсказка: ключи на «Обработка заказов»; принтер 58×40, масштаб 100%
- Нет превью, нет zip, нет «оба сразу», нет формы ключей

---

## Creative phases

- [x] 🎨 **PDF layout** — `memory-bank/creative/creative-stickers-pdf-layout.md`
  - **Decision: Option 2** — полоса **9 мм** фиксированная, оригинал contain в **31 мм**, left, 8→6pt, wrap ≤2, hairline, inset 1 мм
  - Rejected: тонкая 6 мм+ellipsis (multi-SKU), адаптивная полоса (скачет на рулоне), stretch (ломает barcode)
- [x] 🏗️ Architecture — locked в PLAN, CREATIVE skip
- [x] ⚙️ WB PNG vs PDF — locked: PNG→pdf-lib
- [x] UI — locked паттерном `/orders`, CREATIVE skip

---

## Dependencies
- Ozon/WB API живые, креды уже в `.env`
- `pdf-lib`
- Заказы в нужных статусах для ручной проверки (без них PDF не собрать)

## Challenges & mitigations

| Риск | Mitigation |
|------|------------|
| Ozon batch 20: один битый валит всех | retry singles |
| Ozon pageCount ≠ N | caption на все страницы батча / evenly |
| GET WB orders без статуса | обязательный `/orders/status` |
| Stickers только confirm | не слать new |
| Кириллица в Helvetica | артикулы проекта ASCII; если pdf-lib кинет — лог + skip caption char / follow-up TTF |
| Длинный caption не влезает в полосу | CREATIVE: shrink font + wrap |
| Timeout | 180s |
| Принтер fit-to-page растянет | UI hint + MediaBox ровно 58×40 |
| `/orders` регрессия | новые сервисы, старые не трогать |

## Testing
- [x] Unit: `formatArticleCaption` (1 sku, x3, comma list) — 9/9
- [x] Unit: page size ≈ 164.41×113.39 pt
- [x] Live Ozon: 27 этикеток, MediaBox 58.00×40.00 мм
- [x] Live WB: 5 этикеток, application/pdf
- [x] `/orders/fetch` регрессия OK
- [x] FE/BE `npm run build`
- [ ] Ручная печать на термо 58×40 (масштаб 100%)

## Чеклист процесса
- [x] VAN: Level 3
- [x] PLAN
- [x] CREATIVE (`creative-stickers-pdf-layout`) — Option 2
- [x] VAN QA skipped
- [x] BUILD
- [x] REFLECT
- [ ] ARCHIVE

## Documentation
- `docs/features/stickers.md`
- `memory-bank/techContext.md` API
- `projectbrief.md` — стикеры больше не «заглушка» после BUILD

## Предыдущая задача (припаркована)
`copy-articles-clipboard-color` — BUILD done, paste-проверка нет. `frontend/src/utils/copyToClipboard.ts` untracked.
