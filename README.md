# IVF Dashboard — парсер остатков поставщиков тканей

Monorepo: Express (TypeScript) + React (Vite).

## Требования

- Node.js 20+
- npm 10+

## Быстрый старт (dev)

```bash
cp .env.example .env   # при необходимости отредактировать креды
npm install
npm run dev
```

- Frontend: http://localhost:5173 (прокси `/api` → backend)
- Backend: http://localhost:3000
- Auth: логин/пароль из `.env` (`AUTH_USER` / `AUTH_PASSWORD`)

## Продакшн (локально)

```bash
npm install
npm run prod
```

Приложение на http://localhost:3000 — API + статика фронтенда.

## Docker

```bash
cp .env.example .env
docker compose up -d --build
```

- Приложение за nginx: http://localhost (порт 80)
- Прямой доступ к app: http://localhost:3000
- Volumes: `app-storage` (mapping, output), `app-config` (settings.json)

## Структура

```
backend/          Express API, парсеры, хранилище
frontend/         React UI
mapping.xlsx      начальный mapping (копируется в storage при первом запуске)
```

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/config` | Конфиг (пороги, URL, mapping) |
| POST | `/api/config/mapping` | Загрузка mapping.xlsx |
| POST | `/api/config/texdesign-url` | Сохранение URL TexDesign |
| POST | `/api/config/thresholds` | Сохранение порога (`key`: `galtex`, `td`, `ad`, …) |
| POST | `/api/generate` | Генерация остатков (multipart) |
| GET | `/api/download/ozon` | Скачать ozon-stocks.xlsx |
| GET | `/api/download/wb` | Скачать wb-stocks.xlsx |

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `AUTH_USER` | `root` | Basic auth логин |
| `AUTH_PASSWORD` | `root` | Basic auth пароль |
| `PORT` | `3000` | Порт backend |
| `NODE_ENV` | `development` | `production` — отдача статики фронта |
