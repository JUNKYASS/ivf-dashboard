# System Patterns

## Архитектурные решения

### Monorepo с npm workspaces
Корневой `package.json` оркестрирует `backend` и `frontend`. Скрипты `dev`, `build`, `prod` запускаются из корня.

### Backend: сервисный слой
- **Routes** — тонкие контроллеры, только HTTP-обработка
- **Services** — бизнес-логика (`generateService`, `ordersService`, `mappingLookupService`)
- **Parsers** — отдельный модуль на поставщика (`galtex.ts`, `texdesign.ts`, …)

### Frontend: страницы + композиция компонентов
Каждая страница (`ParserPage`, `OrdersPage`) собирается из переиспользуемых блоков (`MappingBlock`, `ThresholdsBlock`, `SupplierCard`, `OrderSupplierGroup`).

### Единый mapping-файл
Один `mapping.xlsx` используется и парсером остатков, и обработкой заказов. Конфигурация листов — в `constants.ts` (`MAPPING_SHEETS`).

### Группировка заказов
Поставщик определяется по префиксу артикула (`SUPPLIER_PREFIX_CONFIG`). Специальные группы: `bedding` (SHF/DC/PC), `unmapped` (MT и несопоставленные).

## Паттерны кода

### Константы в одном месте
`backend/src/constants.ts` — единый источник имён листов, ключей порогов, префиксов поставщиков.

### Дублирование утилит frontend/backend
`fabricMaterial.ts` существует в обоих пакетах — общая логика определения материала ткани.

### Обработка ошибок API
Middleware `errorHandler` в backend; frontend показывает статусы через `StatusBadge`.

## Соглашения

- TypeScript strict mode
- Именование файлов: camelCase для сервисов, PascalCase для React-компонентов
- API-пути: `/api/...`
- Роуты фронта: `/parser`, `/orders`, `/stickers`

## Известные отклонения от ТЗ
- Auth middleware закомментирован в `app.ts` (dev-удобство)
- Страница `/stickers` — этикетки Ozon/WB 58×40 с артикулом МП
- README в корне частично устарел (нет marketplace API)
