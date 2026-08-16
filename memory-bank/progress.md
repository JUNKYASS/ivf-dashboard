# Memory Bank: Progress

## Общий статус проекта
**Рабочий MVP** — парсер остатков и обработка заказов реализованы и используются.

## Реализованные модули

| Модуль | Статус | Примечание |
|--------|--------|------------|
| Парсер остатков (`/parser`) | ✅ Готово | Galtex, TD, AD, TDL, Logos, TT |
| Обработка заказов (`/orders`) | ✅ Готово | Ozon + WB, склад, отрез/рулон, mobile-responsive |
| Генерация стикеров (`/stickers`) | ⏳ Заглушка | UI placeholder |
| Basic Auth | ⚠️ Отключён | Middleware закомментирован |
| Docker деплой | ✅ Готово | docker-compose + nginx |
| Memory Bank | ✅ Инициализирован | 2026-08-09 |
| Живая документация (`docs/`) | 🔄 В процессе | Структура создана |

## Что работает
- Загрузка mapping.xlsx
- Настройка порогов по поставщикам
- Генерация ozon/wb stocks
- Fetch заказов с Ozon и WB
- Сопоставление артикулов и группировка
- Копирование списков артикулов (с учётом остатков на нашем складе)
- Загрузка файла остатков нашего склада (`warehouse-stock.xlsx`)
- WB titles cache sync

## Известный технический долг
- README.md устарел (неполный список API)
- `md spec 1.md` / `md spec 2.md` в корне — устаревшие ТЗ
- Auth отключён в dev
- StickersPage — не реализована

## Архив задач

| Дата | Task ID | Архив |
|------|---------|-------|
| 2026-08-10 | `orders-fabric-cut-roll` | `memory-bank/archive/archive-orders-fabric-cut-roll.md` |
| 2026-08-10 | `orders-warehouse-stock` | `memory-bank/archive/archive-orders-warehouse-stock.md` |

## История инициализации
- **2026-08-09**: VAN init — Memory Bank создан, контекст проекта задокументирован
- **2026-08-10**: ARCHIVE — отрез/рулон в заказах задокументирован и закрыт
- **2026-08-10**: ARCHIVE — остатки «Наш склад» задокументированы и закрыты
- **2026-08-16**: BUILD — mobile-responsive `/orders` (card layout таблицы, full-width actions)
