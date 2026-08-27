# Creative: Parser Generate Block UI

## Requirements
1. Download links — заметнее, secondary-стиль, видна дата последней генерации
2. Кнопка «Сгенерировать» — текст/spinner по центру при loading
3. TexdesignCard — визуально приглушён при выключенном toggle

## Options

### Timestamp source
| Option | Pros | Cons |
|--------|------|------|
| mtime output-файлов | Без миграции config, отражает реальный файл | — |
| Поле в settings.json | Явное | Дублирует mtime |

**Decision:** mtime `ozon-stocks.xlsx` (fallback wb), экспорт через `getOutputStatus()`.

### Download UI
| Option | Pros | Cons |
|--------|------|------|
| Plain `<a>` links | Минимум кода | «Висят в воздухе» |
| Secondary `clay-btn` в panel | Согласовано с design system | Чуть больше разметки |
| Auto-download после generate | Быстро | Уже убрали, не просили |

**Decision:** panel `output-download-panel` + `clay-btn-secondary` + meta-строка с датой.

### Generate button loading
| Option | Pros | Cons |
|--------|------|------|
| disabled + opacity 0.4 | Стандарт | Выглядит бледно, width прыгает |
| `is-loading` + min-width | Стабильный layout, читаемо | — |

**Decision:** column layout, `min-width`, класс `is-loading` без fade.

### Disabled supplier card
**Decision:** модификатор `supplier-card--disabled` — opacity 0.55, `--bg-fill-secondary`, transition.

### Success shimmer on download panel
**Decision:** класс `is-shimmering` на `.output-download-panel`, `::after` с diagonal gradient sweep (glass glare). Триггер только после успешной генерации; `prefers-reduced-motion` отключает.

### Compact supplier cards
**Decision:** scoped CSS на `.supplier-card`. Upload zone — CSS grid 24px + 1fr, `align-items: start`: иконка и label на одной верхней линии, hint под label во второй колонке.

## Implementation guidelines
- Backend: `getOutputStatus()` в configService, поле `outputGeneratedAt` в API
- Frontend: panel под кнопкой, не inline с ней
- TexdesignCard: `supplier-card--disabled` when `!enabled`
