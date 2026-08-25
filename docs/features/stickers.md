# Генерация стикеров (`/stickers`)

Этикетки FBS Ozon и WB 58×40 мм с маркетплейсным артикулом в нижней полосе. Чтобы наклеить на нужный товар и не перепутать.

## Поток
1. Кнопка «Этикетки Ozon» или «Этикетки WB»
2. Backend тянет заказы нужного статуса и оригинальные этикетки
3. Собирает PDF: оригинал contain в верхние ~32.5 мм, артикул в полосе 6.5 мм снизу (5.5pt)
4. Браузер скачивает `{ozon|wb}-labels.pdf`

Ключи API — на странице «Обработка заказов». Печать: 58×40, масштаб 100%, без fit-to-page. В кабинете Ozon лучше сразу формат 58×40.

## Статусы (не те, что на `/orders`)
| МП | Stickers | Orders |
|----|----------|--------|
| Ozon | `awaiting_deliver` (Готово к отгрузке) | `awaiting_packaging` |
| WB | `confirm` + `waiting` + непустой `supplyId` (на сборке) | `/orders/new` |

## Артикул на этикетке
Маркетплейсный. Qty>1 → `ART x3`. Несколько SKU в отправлении → через запятую.

## API
- `POST /api/marketplace/stickers/ozon`
- `POST /api/marketplace/stickers/wb`

Ответ: `application/pdf`. Заголовки `X-Stickers-Count`, `X-Stickers-Skipped`. 400 — нет кредов / нет заказов / 0 этикеток.

Ozon: `package-label` ≤20, битый батч → по одному.  
WB: PNG 58×40 (`/orders/stickers`), PDF собирается на сервере (`pdf-lib`).
