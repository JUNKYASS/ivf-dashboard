# TASK ARCHIVE: Фильтр Отрез / Рулон на `/orders`

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `orders-fabric-type-filter` |
| **Дата начала** | 2026-08-21 |
| **Дата архивации** | 2026-08-21 |
| **Сложность** | Level 2 |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/orders` |

---

## SUMMARY

Кнопки фильтра **«Все отрезы»** / **«Все рулоны»** над списком групп после fetch. Активный фильтр скрывает блоки по поставщикам и показывает один synthetic `OrderGroup` с позициями `fabricSaleType === 'cut' | 'roll'`. Active UI: primary vs secondary кнопки; баннер с × убран по фидбеку. Сброс — повторный клик / новый fetch.

---

## REQUIREMENTS

1. Кнопки после успешного fetch с группами.
2. Exclusive filter cut / roll; повторный клик = clear.
3. Один блок вместо групп поставщиков.
4. Empty state при отсутствии matching rows.
5. Reset фильтра на новый fetch.
6. Frontend only — reuse существующей классификации.

---

## IMPLEMENTATION

| Файл | Изменения |
|------|-----------|
| `frontend/src/utils/fabricSaleType.ts` | `collectRowsByFabricSaleType` |
| `frontend/src/utils/orderGroupLayout.ts` | `filter-cut` / `filter-roll` → `splitMode: 'none'` |
| `frontend/src/pages/OrdersPage.tsx` | state, toggle, synthetic group, empty state, filter buttons |
| `frontend/src/styles/global.css` | `.orders-fabric-type-filters` + mobile |

**Паттерн:** synthetic `OrderGroup` → существующий `OrderSupplierGroup` (SimpleGroup path).

**UI итерации:** слабый `.is-active` → баннер+× → баннер убран, active = primary `clay-btn`.

---

## TESTING

| Проверка | Результат |
|----------|-----------|
| `npm run build` (tsc + vite) | ✅ |
| Ручной UX (active / clear / empty) | ✅ |

---

## LESSONS LEARNED

- Synthetic group + `getFabricSplitMode` лучше форка UI для filter-view.
- Secondary `.is-active` на clay-палитре почти невидим — нужен primary fill.
- Acceptance Level 2 должен явно включать «active vs idle очевидны».

---

## REFERENCES

- Reflection: `memory-bank/reflection/reflection-orders-fabric-type-filter.md`
- Related: `archive-orders-fabric-cut-roll.md` (классификация cut/roll)
