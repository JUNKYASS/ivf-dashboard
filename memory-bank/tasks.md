# Memory Bank: Tasks

## Текущая задача
`copy-articles-clipboard-color` — [Level 1] Копирование артикулов: белый текст на чёрном фоне

## Сложность
**Level 1** — Quick Bug Fix  
VAN → BUILD → REFLECT (без PLAN)

## Проблема
Кнопка «Скопировать арт. поставщика» кладёт в буфер HTML без явного цвета. В dark mode (`prefers-color-scheme: dark`) страница даёт белый текст и чёрный фон — Word/Excel/Docs вставляют это как «чёрное выделение + белый текст».

Нужно: чёрный текст, прозрачный фон. Жирность qty сохранить.

## Решение
В `copyToClipboard.ts`:
- ClipboardItem HTML оборачивается в документ с `color:#000000`, `background-color:transparent`, `color-scheme:light`
- execCommand fallback: те же стили на контейнере и `<span>`/`<b>`
- `mso-highlight:none` — чтобы Word не ставил чёрный highlighter

## Чеклист
- [x] VAN: сложность Level 1
- [x] BUILD: wrap HTML + fallback container styles
- [x] tsc --noEmit
- [ ] Ручная проверка: copy → вставка в Word/Excel (нужен dark OS theme)
- [ ] REFLECT / archive

## Файлы
- `frontend/src/utils/copyToClipboard.ts`

## Статус
BUILD done, ждёт paste-проверку
