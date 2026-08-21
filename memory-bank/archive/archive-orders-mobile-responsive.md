# TASK ARCHIVE: Mobile-responsive `/orders`

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `orders-mobile-responsive` |
| **Дата начала** | 2026-08-16 |
| **Дата архивации** | 2026-08-21 |
| **Сложность** | Level 2 |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/orders` |

---

## SUMMARY

Адаптивная вёрстка таблицы заказов для экранов ≤900px. Итерация 1: CSS card-layout через `data-label`. Итерация 2 (по UX-фидбеку): отдельный compact mobile list с primary row (артикул + ×qty + склад inline) и «Подробнее» для вторичных полей.

---

## REQUIREMENTS

1. Без horizontal scroll на mobile.
2. Артикул и количество — prominent.
3. Склад inline с количеством.
4. Название / поставщик / отправления — по раскрытию.
5. Desktop без регрессий.

---

## IMPLEMENTATION

| Файл | Изменения |
|------|-----------|
| `frontend/src/components/OrderSupplierGroup.tsx` | dual-render: `<table>` desktop + `<ul class="orders-mobile-list">` mobile, expand state |
| `frontend/src/styles/global.css` | media queries, mobile list styles |

---

## TESTING

| Проверка | Результат |
|----------|-----------|
| `npm run build` | ✅ |
| Ручная проверка mobile | ✅ (2 итерации) |

---

## LESSONS LEARNED

Mobile data-heavy списки требуют primary/secondary fields, а не трансформацию всех колонок таблицы.

---

## REFERENCES

- Reflection: `memory-bank/reflection/reflection-orders-mobile-responsive.md`
