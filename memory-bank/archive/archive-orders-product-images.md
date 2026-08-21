# TASK ARCHIVE: Картинки товаров в заказах (кэш + lightbox)

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `orders-product-images` |
| **Дата начала** | 2026-08-21 |
| **Дата архивации** | 2026-08-22 |
| **Сложность** | Level 2 |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/orders` |

---

## SUMMARY

URL картинок товаров для заказов Ozon/WB через **sync-кнопки + JSON-кэш** (не из order API). WB: расширен Content sync (title + photo). Ozon: отдельный product cache. `OrderRow.imageUrl`, thumb 40×40, lightbox по клику (× / Esc / фон / само фото).

---

## REQUIREMENTS

1. Order API не отдаёт images — кэш обязателен.
2. WB: одна кнопка sync → названия + фото.
3. Ozon: отдельная кнопка sync фото.
4. Lookup при «Получить заказы».
5. UI thumb + enlarge/close.

---

## IMPLEMENTATION

| Файл | Изменения |
|------|-----------|
| `backend/src/services/wbTitlesCacheService.ts` | `imageByArticle` / `imageByNmId`, `lookupWbProductImage` |
| `backend/src/services/ozonProductCacheService.ts` | **новый** — list + info/list → cache |
| `backend/src/services/wbOrdersService.ts` / `ozonOrdersService.ts` | `imageUrl` |
| `backend/src/services/ordersService.ts` | aggregate/build `imageUrl` |
| `backend/src/routes/marketplace.ts` | `ozon-products/sync`, status в config |
| `backend/src/types.ts` | `imageUrl`, `OZON_PRODUCT_CACHE_PATH` |
| `frontend/.../OrdersSettingsBlock.tsx` | кнопки WB/Ozon sync |
| `frontend/.../OrderSupplierGroup.tsx` | thumb + lightbox |
| `frontend/src/styles/global.css` | thumb / lightbox |
| `frontend/src/types.ts` / `api/client.ts` | types + API |

**Кэш:** `storage/wb-titles-cache.json`, `storage/ozon-product-cache.json`

---

## TESTING

| Проверка | Результат |
|----------|-----------|
| FE/BE `npm run build` | ✅ |
| Lightbox close (×/Esc/backdrop/image) | ✅ |

---

## LESSONS LEARNED

- Marketplace orders ≠ product media; всегда отдельный catalog lookup.
- WB Content sync — дешёвый способ получить photos вместе с titles.
- Post-BUILD UX (lightbox) нормально включать до archive.

---

## REFERENCES

- Reflection: `memory-bank/reflection/reflection-orders-product-images.md`
- Related: WB titles cache pattern
