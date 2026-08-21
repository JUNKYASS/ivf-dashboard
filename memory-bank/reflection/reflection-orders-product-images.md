# Level 2 Enhancement Reflection: orders-product-images

**Task ID:** `orders-product-images`  
**Дата:** 2026-08-22  
**Сложность:** Level 2  
**Статус:** REFLECT завершён

---

## Enhancement Summary

Картинки товаров в заказах через кэш + sync-кнопки (как WB titles). WB: расширен существующий Content sync (`imageByArticle` / `imageByNmId`). Ozon: отдельный `ozon-product-cache` + sync. `OrderRow.imageUrl` + thumb 40×40. Post-build: клик по миниатюре → lightbox (× / Escape / клик по фону).

---

## What Went Well

- WB почти бесплатно: тот же `get/cards/list` уже отдаёт `photos[]`.
- Паттерн titles-cache переиспользован 1:1 для Ozon.
- Additive schema (`imageBy*`) — старый кэш titles не ломается, нужен re-sync для фото.
- Lightbox добавлен быстро без отдельной CREATIVE.

---

## Challenges Encountered

- Order API не отдаёт images — без кэша фича невозможна (подтверждено VAN).
- Ozon: два шага list → info/list (батчи offer_id); чувствительно к лимитам API.
- После sync нужен повторный fetch заказов — UX не очевиден без hint.

---

## Solutions Applied

- Prefer compact photo URL: `c246x328` → `tm` → `square` → `big`.
- Ozon `primary_image` (string | string[]) + fallback `images[]`.
- Lightbox: fixed overlay, body scroll lock, Escape + backdrop + close btn + клик по самому фото.

---

## Key Technical Insights

- Marketplace order endpoints ≠ product catalog; image всегда отдельный lookup.
- Один sync-проход Content API дешевле CDN-хака по nmId.
- FE/BE дубль статусов кэша (`wbTitlesCache` / `ozonProductCache` в config) — ок для MVP.

---

## Process Insights

- PLAN «Phase A WB → Phase B Ozon» можно закрыть в одном BUILD, если B копирует паттерн A.
- Lightbox — типичный post-BUILD UX feedback; включать в ту же задачу до archive.

---

## Action Items for Future Work

- Опционально: auto-refresh заказов после sync кэша.
- Shared product-meta cache (title+image) вместо двух сервисов.
- Proxy картинок при CORS-проблемах (пока CDN обычно ок для `<img>`).

---

## Time Estimation Accuracy

- Estimated: Medium (~0.5–1 д)
- Actual: ~несколько часов + lightbox polish
- Variance: быстрее — reuse WB sync

---

## Next Steps

→ `/archive`
