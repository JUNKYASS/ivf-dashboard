FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm install

COPY backend ./backend
COPY frontend ./frontend
# COPY mapping.xlsx ./mapping.xlsx

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY backend/package.json ./backend/
RUN npm install --workspace=backend --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist
# COPY --from=builder /app/mapping.xlsx ./mapping.xlsx

RUN mkdir -p backend/storage/output backend/config

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
