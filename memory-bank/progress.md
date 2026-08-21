# Memory Bank: Progress

## Общий статус проекта
**Рабочий MVP** — парсер остатков и обработка заказов реализованы и используются.

## Реализованные модули

| Модуль | Статус | Примечание |
|--------|--------|------------|
| Парсер остатков (`/parser`) | ✅ Готово | Galtex, TD, AD, TDL, Logos, TT; фильтр undefined в Ozon |
| Обработка заказов (`/orders`) | ✅ Готово | Ozon + WB, склад, отрез/рулон, фильтры тип+поставщик (вкл. Феникс), mobile, upload UI persist |
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
- Фильтр «Все отрезы» / «Все рулоны» + фильтр по поставщикам (ортогонально; Феникс/FNX)
- Копирование списков артикулов (с учётом остатков на нашем складе; Galtex natural sort)
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
| 2026-08-21 | `orders-supplier-filter` | `memory-bank/archive/archive-orders-supplier-filter.md` |
| 2026-08-21 | `orders-filter-buttons-unify-style` | `memory-bank/archive/archive-orders-filter-buttons-unify-style.md` |
| 2026-08-21 | `orders-fabric-type-filter` | `memory-bank/archive/archive-orders-fabric-type-filter.md` |
| 2026-08-21 | `galtex-copy-article-sort` | `memory-bank/archive/archive-galtex-copy-article-sort.md` |
| 2026-08-21 | `warehouse-upload-ui-persist` | `memory-bank/archive/archive-warehouse-upload-ui-persist.md` |
| 2026-08-21 | `parser-ozon-undefined-filter` | `memory-bank/archive/archive-parser-ozon-undefined-filter.md` |
| 2026-08-21 | `orders-mobile-responsive` | `memory-bank/archive/archive-orders-mobile-responsive.md` |
| 2026-08-10 | `orders-fabric-cut-roll` | `memory-bank/archive/archive-orders-fabric-cut-roll.md` |
| 2026-08-10 | `orders-warehouse-stock` | `memory-bank/archive/archive-orders-warehouse-stock.md` |

## История инициализации
- **2026-08-09**: VAN init — Memory Bank создан
- **2026-08-21**: ARCHIVE — warehouse upload UI persist, parser ozon filter, mobile-responsive
- **2026-08-21**: BUILD — `galtex-copy-article-sort`
- **2026-08-21**: VAN → PLAN → BUILD → REFLECT — `orders-fabric-type-filter`
- **2026-08-21**: ARCHIVE — `orders-fabric-type-filter` + `galtex-copy-article-sort`
- **2026-08-21**: VAN — `orders-supplier-flat-cut-roll-sort` (Level 1) — flat list + sort cut→roll
- **2026-08-21**: CANCEL — `orders-supplier-flat-cut-roll-sort` (отменена, код не трогали)
- **2026-08-21**: VAN — `orders-supplier-filter` (Level 2) — supplier + cut/roll orthogonal filters → PLAN
- **2026-08-21**: PLAN — `orders-supplier-filter` — orthogonal filters locked, CREATIVE skip → BUILD
- **2026-08-21**: PLAN amend — `orders-supplier-filter` + Феникс (`FNX`/`fenix`) в каталог и constants
- **2026-08-21**: BUILD — `orders-supplier-filter` — dual filters + FNX, FE/BE build OK → REFLECT
- **2026-08-21**: REFLECT — `orders-supplier-filter` → ARCHIVE
- **2026-08-21**: VAN+BUILD — `orders-filter-buttons-unify-style` (единый стиль кнопок фильтров)
- **2026-08-21**: ARCHIVE — `orders-supplier-filter` + `orders-filter-buttons-unify-style`
