# Memory Bank: Progress

## Общий статус проекта
**Рабочий MVP** — парсер остатков и обработка заказов реализованы и используются.

## Реализованные модули

| Модуль | Статус | Примечание |
|--------|--------|------------|
| Парсер остатков (`/parser`) | ✅ Готово | Galtex, TD, AD, TDL, Logos, TT; фильтр undefined в Ozon |
| Обработка заказов (`/orders`) | ✅ Готово | Ozon + WB, склад, отрез/рулон, mobile-responsive, upload UI persist |
| Генерация стикеров (`/stickers`) | ⏳ Заглушка | UI placeholder |
| Basic Auth | ⚠️ Отключён | Middleware закомментирован |
| Docker деплой | ✅ Готово | docker-compose + nginx |
| Memory Bank | ✅ Инициализирован | 2026-08-09 |
| Живая документация (`docs/`) | 🔄 В процессе | Структура создана |

## Что работает
- Загрузка mapping.xlsx
- Настройка порогов по поставщикам
- Генерация ozon/wb stocks (без undefined в артикулах Ozon)
- Fetch заказов с Ozon и WB
- Сопоставление артикулов и группировка
- Копирование списков артикулов (с учётом остатков на нашем складе)
- Загрузка файла остатков нашего склада с персистентным UI
- WB titles cache sync

## Известный технический долг
- README.md устарел (неполный список API)
- `md spec 1.md` / `md spec 2.md` в корне — устаревшие ТЗ
- Auth отключён в dev
- StickersPage — не реализована

## Архив задач

| Дата | Task ID | Архив |
|------|---------|-------|
| 2026-08-21 | `warehouse-upload-ui-persist` | `memory-bank/archive/archive-warehouse-upload-ui-persist.md` |
| 2026-08-21 | `parser-ozon-undefined-filter` | `memory-bank/archive/archive-parser-ozon-undefined-filter.md` |
| 2026-08-21 | `orders-mobile-responsive` | `memory-bank/archive/archive-orders-mobile-responsive.md` |
| 2026-08-10 | `orders-fabric-cut-roll` | `memory-bank/archive/archive-orders-fabric-cut-roll.md` |
| 2026-08-10 | `orders-warehouse-stock` | `memory-bank/archive/archive-orders-warehouse-stock.md` |

## История инициализации
- **2026-08-09**: VAN init — Memory Bank создан
- **2026-08-21**: ARCHIVE — warehouse upload UI persist, parser ozon filter, mobile-responsive
- **2026-08-21**: BUILD — `galtex-copy-article-sort` (natural sort при копировании артикулов Galtex)
