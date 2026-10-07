# Level 2 Enhancement Reflection: orders-yandex-market

**Task ID:** `orders-yandex-market` (+ `orders-ym-product-images`)  
**Дата:** 2026-10-07  
**Сложность:** Level 2  
**Статус:** REFLECT завершён

---

## Enhancement Summary

Интеграция Яндекс Маркета на странице «Обработка заказов»:

1. **Заказы** — FBS, статус `PROCESSING` / `STARTED`, merge с Ozon/WB в общую группировку по поставщикам.
2. **Конфиг** — `YM_API_TOKEN` в `.env` + поле в Settings.
3. **Кэш фото** — `offer-mappings` → `storage/ym-product-cache.json`, sync-кнопка, lookup при fetch заказов.

API: Partner API (`Api-Key`), `GET /v2/campaigns`, `POST /v1/businesses/{id}/orders`, `POST /v2/businesses/{id}/offer-mappings`.

---

## What Went Well

- Паттерн Ozon/WB скопирован без изобретений: env → service → ordersService merge → status line на UI.
- Живой smoke-test API до кода — сразу видны businessId, формат `offerId`, наличие `pictures`.
- `ymApiUtils.ts` — DRY для businessId/FBS context между orders и product cache.
- Кэш YM проще Ozon: один endpoint, без list→info batch.
- Названия товаров приходят в order API (`offerName`) — отдельный title-cache не нужен.

---

## Challenges Encountered

- Order API YM не отдаёт картинки — без кэша thumbs пустые (как Ozon/WB).
- Deprecated `GET /v2/campaigns/{id}/orders` — использован актуальный `POST /v1/businesses/{id}/orders`.
- Нужен `businessId` + FBS `campaignIds` — два разных контекста (заказы vs каталог).
- Rate limit offer-mappings: 100 req/min → throttle 650ms, полный sync каталога может занять минуты.

---

## Solutions Applied

- Фильтр заказов: `statuses: PROCESSING`, `substatuses: STARTED`, `programTypes: FBS`.
- Префикс отправления `YM{orderId}` — консистентно с `OZN` / `WB`.
- `pickYmImageUrl` — первый непустой URL из `pictures[]`.
- Тесты на `node:test` (не vitest — в проекте нет vitest).

---

## Key Technical Insights

- YM `offerId` = SKU продавца (формат `GT-220120-BZ-...`) — совместим с `getArticlePrefix` / mapping.
- `offer-mappings` без body возвращает весь каталог постранично — удобнее batch по offerIds для sync.
- Токен `ACMA:...` — Api-Key header, не OAuth Bearer.

---

## Process Insights

- VAN → BUILD без PLAN для orders — ок для Level 2 copy-paste; для image cache PLAN помог зафиксировать endpoint.
- Две фазы (orders → images) логичнее одной задачи в memory bank, но допустимо как parent + subtask.

---

## Action Items for Future Work

- Этикетки YM (`/stickers`) — отдельная задача, если понадобится.
- Auto-refresh заказов после sync кэша (как идея из orders-product-images).
- Кэш titles YM не нужен, но можно добавить в reviews если YM появится там.

---

## Time Estimation Accuracy

- Estimated: ~0.5–1 д (Level 2 × 2 фазы)
- Actual: один сеанс, API-first validation сильно ускорил
- Variance: быстрее — готовые паттерны Ozon/WB

---

## Next Steps

→ `/archive`
