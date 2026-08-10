# Style Guide

## Язык
- UI: русский
- Код: английский (имена переменных, функций, файлов)
- Комментарии: русский для бизнес-логики, английский для технических

## Frontend

### CSS-классы (существующие паттерны)
- `layout`, `app-header`, `segmented-nav` — каркас
- `page-title` — заголовок страницы
- `section`, `clay-card` — карточки секций
- `empty-state` — пустое/заглушечное состояние
- `segmented-link`, `active` — навигация

### Компоненты
- Блоки конфигурации: `*Block.tsx` (MappingBlock, ThresholdsBlock, MarketplaceApiBlock)
- Карточки поставщиков: `*Card.tsx` (GaltexCard, TexdesignCard, SupplierCard)
- Статусы: `StatusBadge`

## Backend
- Сервисы: `*Service.ts`
- Парсеры: `backend/src/services/parsers/*.ts`
- Роуты: один файл на домен (`config.ts`, `api.ts`, `marketplace.ts`)

## Git / Документация
- Memory Bank: `memory-bank/`
- Живая документация: `docs/`
- Архив ТЗ: `docs/specs/`

## Принципы
- Минимальный diff — не менять несвязанный код
- Следовать существующим абстракциям, не создавать лишних хелперов
- При изменении API/роутов — обновлять `docs/` и `memory-bank/techContext.md`
