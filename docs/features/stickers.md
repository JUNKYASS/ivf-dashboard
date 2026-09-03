# Генерация стикеров (`/stickers`)

Этикетки FBS Ozon и WB 58×40 мм с маркетплейсным артикулом в нижней полосе. Чтобы наклеить на нужный товар и не перепутать.

## Поток
1. В блоке Ozon или Wildberries: «Все этикетки» или «Нераспечатанные»
2. Backend тянет заказы нужного статуса и оригинальные этикетки
3. Собирает PDF: оригинал contain в верхние ~32.5 мм, артикул в полосе 6.5 мм снизу (5.5pt)
4. Браузер скачивает `{ozon|wb}-labels.pdf`

Ключи API — в «Настройках». Печать: 58×40, масштаб 100%, без fit-to-page. В кабинете Ozon лучше сразу формат 58×40.

**Нераспечатанные** — этикетки, которые ещё не скачивали **из этого приложения**. Скачивание в кабинете Ozon/WB не учитывается. Учёт в `backend/storage/printed-labels.json`; записи старше 45 дней и не из текущего списка заказов удаляются при генерации.

Имя файла при скачивании: `{ozon|wb}-labels[-unprinted]-YYYY-MM-DD_HH-mm.pdf` (локальное время браузера).

## Статусы (не те, что на `/orders`)
| МП | Stickers | Orders |
|----|----------|--------|
| Ozon | `awaiting_deliver` (Готово к отгрузке) | `awaiting_packaging` |
| WB | `confirm` + `waiting` + непустой `supplyId` (на сборке) | `/orders/new` |

## Артикул на этикетке
Маркетплейсный. Qty>1 → `ART x3`. Несколько SKU в отправлении → через запятую.

## API
- `POST /api/marketplace/stickers/ozon`
- `POST /api/marketplace/stickers/ozon?scope=unprinted`
- `POST /api/marketplace/stickers/wb`
- `POST /api/marketplace/stickers/wb?scope=unprinted`

Ответ: `application/pdf`. Заголовки `X-Stickers-Count`, `X-Stickers-Skipped`. 400 — нет кредов / нет заказов / 0 этикеток / нет нераспечатанных.

Ozon: `package-label` ≤20, битый батч → по одному.  
WB: PNG 58×40 (`/orders/stickers`), PDF собирается на сервере (`pdf-lib`).
