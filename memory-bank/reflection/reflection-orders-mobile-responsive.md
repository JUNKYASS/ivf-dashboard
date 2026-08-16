# Reflection: Mobile-responsive `/orders`

**Task ID:** `orders-mobile-responsive`  
**Дата:** 2026-08-16  
**Сложность:** Level 2  
**Статус:** REFLECT завершён (итерация 2 после UX-фидбека)

---

## Summary

Страница «Обработка заказов» адаптирована под мобильные экраны (≤900px). Первая итерация использовала CSS card-layout поверх `<table>` через `data-label` — все 5 колонок в каждой карточке. После ручной проверки карточки оказались слишком высокими.

Вторая итерация (по фидбеку): отдельный компактный mobile-список с primary view (артикул + кол-во, склад inline) и раскрываемыми деталями (название, поставщик, отправления).

---

## What Went Well

1. **Dual-render без ломания desktop** — `<table>` для desktop, `<ul class="orders-mobile-list">` для mobile. Переключение через `display: none/block` в media query. Desktop-таблица не тронута.

2. **CSS-only card layout оказался недостаточным** — быстро реализовался, но UX-плотность плохая при 5 полях. Переход на отдельный mobile markup — правильное решение.

3. **Inline склад + кол-во** — `×5` + `склад 2` справа в одной строке. Убрана отдельная строка «Наш склад», экономия ~40% высоты карточки.

4. **Progressive disclosure** — «Подробнее» только если есть что показать (title / supplier / postings). Строки без деталей — одна компактная строка.

5. **Build стабилен** — `npm run build` проходит после обеих итераций.

---

## Challenges

1. **Первый подход (data-label cards)** — технически корректный responsive table pattern, но для операционной таблицы с 5 колонками на телефоне даёт слишком много вертикального скролла. Нужен был product-driven redesign, а не только CSS.

2. **Дублирование разметки строки** — desktop table + mobile list. Приемлемый trade-off для Level 2; альтернатива (единый card component на все breakpoints) потребовала бы переписать desktop UI.

3. **Per-row expand state** — `Set<string>` по `marketplaceArticle`. При дубликатах артикула в одной таблице (маловероятно после группировки) toggle затронет обе строки. Риск низкий, не блокер.

4. **Нет автотестов UI** — проверка только build + manual. В проекте нет vitest/playwright.

---

## Lessons Learned

1. **Mobile ≠ сжатая таблица** — для data-heavy списков лучше сразу проектировать primary/secondary fields, а не трансформировать все колонки в labeled rows.

2. **REFLECT с UX-фидбеком = mini-CREATIVE** — пользовательский feedback на preview быстро выявил проблему первого решения. Стоит для UI-задач Level 2 закладывать «compact view» в план сразу.

3. **Склад рядом с кол-вом** — логичная группировка для оператора: «сколько заказали / сколько уже есть». Отдельная колонка на mobile избыточна.

---

## Process Improvements

1. Для UI Level 2 — в PLAN добавлять mock структуры: *primary fields / hidden fields / expand trigger*.

2. После BUILD — короткий чеклист mobile density (кол-во строк на экране, не только «нет horizontal scroll»).

3. Рассмотреть vitest + `@testing-library/react` smoke для dual-render (table visible / list hidden на desktop и наоборот).

---

## Technical Improvements (Future)

| Улучшение | Приоритет | Описание |
|-----------|-----------|----------|
| Единый `OrderRowView` | Низкий | Shared subcomponents для article/qty/postings |
| `useMediaQuery('(max-width: 900px)')` | Низкий | Не рендерить скрытый DOM на mobile |
| Expand all / collapse all | Низкий | Для длинных списков в группе |
| Breakpoint 640px | Низкий | Отдельные правила только для телефона vs tablet |

---

## Comparison with Requirements

| Требование | Итерация 1 | Итерация 2 |
|------------|------------|------------|
| Без horizontal scroll | ✅ | ✅ |
| Читаемо на телефоне | ⚠️ слишком высоко | ✅ compact |
| Артикул + кол-во prominent | ❌ равные строки | ✅ main row |
| Склад inline с кол-вом | ❌ отдельная строка | ✅ |
| Secondary fields доступны | ✅ всегда видны | ✅ по «Подробнее» |
| Desktop без регрессий | ✅ | ✅ |

---

## Next Steps

→ `/archive` — зафиксировать финальную реализацию в `memory-bank/archive/archive-orders-mobile-responsive.md`
