# TASK ARCHIVE: Фильтр по поставщикам + Феникс

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `orders-supplier-filter` |
| **Дата начала** | 2026-08-21 |
| **Дата архивации** | 2026-08-21 |
| **Сложность** | Level 2 |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/orders` |

---

## SUMMARY

Ортогональный фильтр по поставщикам (10 fabric keys, включая **Феникс** / `FNX`) рядом с Отрез/Рулон. Комбинации: all / S / F / S∩F. UI: две строки. Follow-up: единый стиль кнопок обеих строк (см. `orders-filter-buttons-unify-style`).

---

## REQUIREMENTS

1. Независимые `supplierFilter` + `fabricTypeFilter`.
2. 10 поставщиков включая Феникс; без bedding/unmapped.
3. Backend registration `FNX` → группа не в unmapped.
4. Empty states / reset обоих на fetch.

---

## IMPLEMENTATION

| Файл | Изменения |
|------|-----------|
| `backend/src/constants.ts` | `FNX` / `fenix` в config + `ORDER_GROUP_KEYS` |
| `backend/src/services/ordersService.ts` | `GROUP_TITLES.fenix` |
| `frontend/src/utils/fabricSaleType.ts` | `FNX` в prefixes |
| `frontend/src/utils/orderSupplierFilters.ts` | **новый** — catalog + `resolveFilteredOrdersView` |
| `frontend/src/utils/orderGroupLayout.ts` | `filter-*` → `none` |
| `frontend/src/pages/OrdersPage.tsx` | dual state, две строки |
| `frontend/src/styles/global.css` | filter rows / catalog styles |

---

## TESTING

| Проверка | Результат |
|----------|-----------|
| `frontend` npm run build | ✅ |
| `backend` npm run build | ✅ |

---

## LESSONS LEARNED

- Новый supplier в UI-фильтрах требует backend prefix registration.
- Одна `resolveFilteredOrdersView` лучше ветвления в JSX.
- FE/BE дубль supplier catalogs — tech debt.

---

## REFERENCES

- Reflection: `memory-bank/reflection/reflection-orders-supplier-filter.md`
- Related: `archive-orders-fabric-type-filter.md`
- Follow-up polish: `archive-orders-filter-buttons-unify-style.md`
