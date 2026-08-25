# Tech Context

## Стек

| Слой | Технологии |
|------|------------|
| Frontend | React 18, TypeScript, Vite, React Router |
| Backend | Express, TypeScript, Node.js 20+ |
| Данные | XLSX (SheetJS), fast-xml-parser, pdf-lib |
| HTTP | axios |
| Деплой | Docker, docker-compose, nginx |

## Структура репозитория

```
ivf-dashboard/
├── backend/src/
│   ├── app.ts              # Express app factory
│   ├── routes/             # API роуты (config, api, marketplace)
│   ├── services/           # Бизнес-логика
│   │   └── parsers/        # Парсеры по поставщикам
│   ├── middleware/         # Auth, error handler
│   └── constants.ts        # Листы mapping, префиксы поставщиков
├── frontend/src/
│   ├── pages/              # ParserPage, OrdersPage, StickersPage
│   ├── components/         # UI-блоки
│   └── api/client.ts       # HTTP-клиент
├── mapping.xlsx            # Начальный mapping (копируется в storage)
├── docker-compose.yml
└── nginx.conf
```

## API (актуальное)

### Config / Parser
- `GET /api/config`
- `POST /api/config/mapping`
- `POST /api/config/texdesign-url`
- `POST /api/config/thresholds`
- `POST /api/generate`
- `GET /api/download/ozon`
- `GET /api/download/wb`

### Marketplace / Orders
- `GET /api/config/marketplace-api`
- `POST /api/config/marketplace-api`
- `POST /api/marketplace/wb-titles/sync`
- `POST /api/marketplace/ozon-products/sync`
- `POST /api/marketplace/orders/fetch`
- `POST /api/marketplace/stickers/ozon` — PDF этикеток FBS awaiting_deliver
- `POST /api/marketplace/stickers/wb` — PDF стикеров WB confirm

## Хранилище (runtime)
- `backend/storage/mapping.xlsx` — загруженный mapping
- `backend/storage/output/` — сгенерированные файлы остатков
- `backend/storage/settings.json` — пороги, URL, креды

## Окружение

| Переменная | Описание |
|------------|----------|
| `AUTH_USER` / `AUTH_PASSWORD` | Basic auth (сейчас middleware закомментирован) |
| `PORT` | Порт backend (3000) |
| `NODE_ENV` | `production` — отдача статики фронта |

## Dev-запуск
```bash
npm install
npm run dev    # backend :3000 + frontend :5173 (proxy /api)
```

## Платформа разработки
- OS: Windows 10
- Shell: PowerShell
- Node: v22.17.0, npm: 10.9.2
