# Tasks

## Current Task
- **ID:** `reviews-average-rating-page`
- **Status:** BUILD complete — ready for `/reflect`
- **Complexity:** Level 2

## Проблемы пользователя

1. **Поиск по артикулу маркетплейса** (`LT-240105-PST-1-1x1orange`) не работает для WB
2. **Синхронизация WB** должна быть в Настройках, не на странице Отзывы
3. **403 при sync WB** — `WB: Request failed with status code 403`
4. **429 при sync WB** — rate limit Feedbacks API → retry по `X-Ratelimit-Retry` + throttle
5. **UI:** убрать subtitle, переименовать блоки в «WB» / «Ozon»

---

## Диагностика

### 1. Артикул WB не находится

Артикул `LT-240105-PST-1-1x1orange` **есть** в `wb-titles-cache.json` (`byArticle`), nmId = `1250156414` (`byNmId`).

Но `nmIdByArticle` в кэше **отсутствует** — файл создан до добавления поля.  
`lookupWbNmId()` ищет только `nmIdByArticle` → возвращает `null` → lookup в кэше отзывов не срабатывает.

**Корневая причина:** нет резолва marketplace article → nmId без пересинка кэша товаров.

### 2. WB sync 403

`POST /marketplace/reviews/wb/sync` → `GET feedbacks-api.wildberries.ru/api/v1/feedbacks`.

403 = токен `WB_API_TOKEN` **без категории «Отзывы и вопросы»**.  
Тот же токен работает для заказов/стикеров (`marketplace-api`), но Feedbacks API — отдельная категория при создании токена в ЛК WB.

**Не баг кода** — нужен токен с нужным scope или понятная ошибка в UI.

### 3. Архитектурный разрыв

- Ozon: live-запрос по артикулу при проверке ✅
- WB: требует предварительный bulk sync → lookup из кэша ❌ (неудобно + 403 блокирует)

---

## План реализации

### Фаза A — Backend: lookup по артикулу маркетплейса (приоритет)

**A1. Починить `lookupWbNmId()`** (`wbTitlesCacheService.ts`)

```typescript
// 1. nmIdByArticle (после пересинка кэша товаров)
// 2. Fallback: byArticle[article] → найти nmId с тем же title в byNmId
```

Работает с **текущим** кэшем без пересинка.

**A2. WB check = live API по nmId** (как Ozon/MPSTATS)

Новая функция `fetchWbReviewRating(article, wbToken)`:
1. `nmId = lookupWbNmId(article)` — если null → ошибка «Артикул не найден в кэше товаров WB. Обновите кэш WB в Настройках»
2. `GET /api/v1/feedbacks?nmId={nmId}&take=5000` (+ archive endpoint)
3. `avg(productValuation)` по ответу
4. Опционально: сохранить в `reviews-cache.json` для повторных запросов

Route `GET /reviews/rating?marketplace=wb` → **async**.

**A3. Улучшить ошибку 403**

```typescript
if (status === 403) {
  return 'WB: токен без доступа к «Отзывы и вопросы». Создайте токен с этой категорией в seller.wildberries.ru → Настройки → Доступ к API';
}
```

**A4. Ozon** — placeholder/label «Артикул маркетплейса» (offer_id), логика уже через `resolveOzonSku`.

### Фаза B — Frontend: UX

| Изменение | Файл |
|---|---|
| Убрать `<p className="page-subtitle">` | `ReviewsPage.tsx` |
| Заголовки блоков: «WB» / «Ozon» | `ReviewsPage.tsx` |
| Placeholder/input label: «Артикул маркетплейса» | `ReviewsPage.tsx` |
| Убрать sync-grid и кнопку sync с ReviewsPage | `ReviewsPage.tsx` |
| Показывать только статус кэша WB (дата, если есть) или hint | `ReviewsPage.tsx` |
| Перенести «Синхронизировать отзывы WB» в Settings | `OrdersSettingsBlock.tsx` |
| Hint в Settings: «Нужна категория токена „Отзывы и вопросы“» | `OrdersSettingsBlock.tsx` |
| Обновить section-hint на ReviewsPage | `ReviewsPage.tsx` |

### Фаза C — Тесты

- `lookupWbNmId` fallback через title match
- `aggregateWbFeedbacks` / `fetchWbReviewRating` mock
- 403 error formatting

---

## Поведение после фикса

| Действие | WB | Ozon |
|---|---|---|
| Ввод | `LT-240105-PST-1-1x1orange` | `LT-240105-PST-1-1x1orange` (offer_id) |
| Резолв | article → nmId (кэш товаров) | offer_id → sku (Ozon API) |
| Данные | Seller API feedbacks по nmId | MPSTATS comments |
| Sync | Опционально в Settings (bulk) | Не нужен |

**Минимум для работы WB:**
1. Кэш товаров WB обновлён (уже есть в Settings)
2. Токен с категорией «Отзывы и вопросы»

---

## Checklist

- [x] A1: `lookupWbNmId` fallback (`resolveWbNmIdFromCache` via title match)
- [x] A2: `fetchWbReviewRating` live по nmId
- [x] A3: понятная ошибка 403
- [x] B: UI ReviewsPage (subtitle, заголовки, placeholders)
- [x] B: sync WB → OrdersSettingsBlock
- [x] C: тесты (26/26 pass)
- [ ] Reflection + archive

## Status
- [x] Предыдущий BUILD (WB sync + MPSTATS Ozon)
- [x] PLAN (доработки)
- [x] BUILD фазы A–C

## Test results (2026-09-05)
- `npm test` backend: **28/28 pass** (incl. 429 retry/format)
- `npm run build` backend + frontend: **OK**

## Next Step
→ `/reflect`
