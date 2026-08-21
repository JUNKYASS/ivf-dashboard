# Level 2 Enhancement Reflection: orders-fabric-type-filter

**Task ID:** `orders-fabric-type-filter`  
**Дата:** 2026-08-21  
**Сложность:** Level 2  
**Статус:** REFLECT завершён

---

## Enhancement Summary

На `/orders` добавлены кнопки фильтра «Все отрезы» / «Все рулоны»: активный фильтр скрывает группы по поставщикам и показывает один блок с matching `fabricSaleType`. После первого UI-pass: баннер «Фильтр: …» с × (позже убран) + primary-стиль у выбранной кнопки. Финальный UI — только кнопки primary/secondary, сброс повторным кликом.

---

## What Went Well

- Reuse `OrderSupplierGroup` через synthetic `OrderGroup` + `getFabricSplitMode(filter-*) → none` — без дублирования таблицы/copy.
- Данные уже были (`fabricSaleType`) — frontend-only, без backend.
- PLAN без CREATIVE сработал: решения зафиксировали заранее, BUILD линейный.
- Быстрый polish активного состояния по фидбеку до archive.

---

## Challenges Encountered

- Слабый `.is-active` на `clay-btn-secondary` (фон почти как inactive) — фильтр визуально «не читался».
- Copy/sort Galtex в filter-view намеренно упрощены (`groupKey !== 'galtex'`).

---

## Solutions Applied

- Активная кнопка = primary `clay-btn`, неактивная = `clay-btn-secondary` (баннер с × убран перед archive).
- Empty state и reset на fetch — как в PLAN.

---

## Key Technical Insights

- Для «одного блока» лучше synthetic group + существующий splitMode, чем форк компонента.
- Active state на secondary-кнопках почти невидим на clay-палитре — нужен контраст (primary fill) или отдельный chip/banner.

---

## Process Insights

- Level 2 UX-детали (active affordance) стоит явно чеклистить в acceptance («active vs idle очевидны»), иначе всплывают на reflect.
- Небольшой UI-polish после BUILD ок включать в ту же задачу до archive.

---

## Action Items for Future Work

- Опционально: natural sort Galtex внутри filter-блока.
- Расширяемые фильтры (поставщик, bedding) — тот же паттерн banner + exclusive state.
- Archive pending: `galtex-copy-article-sort`.

---

## Time Estimation Accuracy

- Estimated: Small (~1–2 ч)
- Actual: ~1 ч (+ короткий UI polish)
- Variance: в пределах estimate
- Reason: готовая классификация, reuse UI

---

## Next Steps

→ `/archive`
