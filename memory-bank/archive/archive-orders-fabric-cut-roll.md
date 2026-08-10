# TASK ARCHIVE: Отрез / рулон в заказах

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `orders-fabric-cut-roll` |
| **Дата начала** | 2026-08-10 |
| **Дата архивации** | 2026-08-10 |
| **Сложность** | Level 3 |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/orders` |

---

## SUMMARY

Реализовано разделение тканевых позиций внутри групп поставщиков на **отрезы** (≤ 20 м) и **рулоны** (> 20 м) по длине в артикуле. Добавлены бейджи, подсекции в UI и отдельные кнопки копирования. Группа «Постельное бельё» не затронута; в «Без сопоставления» split применяется только к тканевым карточкам.

Реализация полностью соответствует CREATIVE и PLAN. Отклонений от утверждённых решений нет.

---

## REQUIREMENTS

1. Классификация **только по артикулу** — `productTitle` не используется.
2. Длина в метрах — сегмент артикула **сразу после кода материала** (BZ, ST, PP…).
3. **Отрез:** длина ≤ 20 м. **Рулон:** длина > 20 м.
4. Тканевая карточка: первый префикс артикула ∈ префиксам поставщиков ткани.
5. Компактные бейджи «отрез» / «рулон» inline в ячейке артикула.
6. Отдельные кнопки Copy для отрезов и рулонов (с учётом остатков склада).
7. «Постельное бельё» — без изменений.
8. «Без сопоставления» — разделение только для тканевых карточек.

---

## DESIGN DECISIONS

Ключевые решения зафиксированы в CREATIVE:

- Классификатор на **backend**; поле `OrderRow.fabricSaleType: 'cut' | 'roll' | null`.
- UI: **подсекции** внутри `OrderSupplierGroup` (не вкладки, не вложенные CollapsibleSection).
- `FabricSplitMode`: `none` (bedding) | `all` (поставщики) | `fabric-only` (unmapped).
- Ткань без распознанной длины → секция «Прочее», без бейджа.

**Creative:** `memory-bank/creative/creative-orders-fabric-cut-roll.md`

---

## IMPLEMENTATION

### Backend

| Файл | Изменения |
|------|-----------|
| `backend/src/services/fabricSaleTypeService.ts` | **новый** — `classifyFabricSaleType`, `isFabricSupplierPrefix`, `parseFabricLengthMeters` |
| `backend/src/constants.ts` | `FABRIC_CUT_MAX_LENGTH_M = 20` |
| `backend/src/types.ts` | `FabricSaleType`, поле `fabricSaleType` в `OrderRow` |
| `backend/src/services/ordersService.ts` | заполнение `fabricSaleType` при сборке строк заказа |

### Frontend

| Файл | Изменения |
|------|-----------|
| `frontend/src/utils/fabricSaleType.ts` | **новый** — клиентская фильтрация, `FABRIC_SUPPLIER_PREFIXES` |
| `frontend/src/utils/orderGroupLayout.ts` | **новый** — `FabricSplitMode`, `splitRowsByFabricSaleType`, `getFabricSplitModeForGroup` |
| `frontend/src/components/OrderSupplierGroup.tsx` | подсекции Отрезы / Рулоны / Прочее, бейджи, `CopyRowsButton`, `OrdersTable` |
| `frontend/src/types.ts` | `fabricSaleType` в `OrderRow` |
| `frontend/src/styles/global.css` | `.fabric-type-badge`, `.orders-fabric-subsection`, стили copy-ошибок |

### Алгоритм классификации

```
1. Первый сегмент артикула (до '-') ∈ SUPPLIER_PREFIX_CONFIG → ткань
2. Найти код материала по FABRIC_MATERIAL_CODE_ORDER
3. Следующий сегмент — длина в метрах (целое число)
4. length ≤ 20 → cut; length > 20 → roll; иначе null
```

### Интеграция с существующими фичами

- **Остатки склада** — `warehouseStockEnabled` и вычитание при copy работают в каждой подсекции.
- **Toggle склада** — колонка «Наш склад» отображается во всех таблицах подсекций.

### UI-доработки после BUILD

- Разделитель в `OrdersSettingsBlock` между «API маркетплейсов» и «Кэш названий WB».
- Убрано дублирование «Кэш названий WB» в строке статуса кэша.

---

## TESTING

| Проверка | Результат |
|----------|-----------|
| `npm run build` (backend + frontend) | ✅ |
| Unit-тесты `fabricSaleTypeService` | ❌ не добавлены |
| Ручная проверка на реальных заказах | ⏳ рекомендуется |

**Рекомендуемый ручной чеклист:**
- Отрезы 8 м (GT, TD)
- Рулоны 33 м, 50 м
- Unmapped: MT (неткань) vs GT (ткань)
- Bedding без split
- Copy с включённым/выключенным складом

---

## LESSONS LEARNED

1. **Уточнение правила на CREATIVE экономит BUILD** — изначальный анализ VAN (название WB) оказался ложным следом; заказчик задал однозначное правило по метражу в артикуле.
2. **`FabricSplitMode` как enum** — паттерн `none | all | fabric-only` хорошо масштабируется для особых групп без if-else по `group.key`.
3. **Минимальное изменение API** — `OrderGroup` не менялся; одно поле в `OrderRow`, UI фильтрует на клиенте.

### Технический долг

| Улучшение | Приоритет |
|-----------|-----------|
| Unit-тесты `fabricSaleTypeService` | Высокий |
| Единый source-of-truth для префиксов/материалов (backend ↔ frontend) | Средний |
| Вынести `OrdersTable`, `CopyRowsButton` в отдельные файлы | Средний |
| Документация в `docs/features/orders-fabric-cut-roll.md` | Низкий |

---

## REFERENCES

- Creative: `memory-bank/creative/creative-orders-fabric-cut-roll.md`
- Reflection: `memory-bank/reflection/reflection-orders-fabric-cut-roll.md`
- Связанная фича (склад): `memory-bank/archive/archive-orders-warehouse-stock.md`

---

## WORKFLOW

```
VAN → CREATIVE → PLAN → BUILD → REFLECT → ARCHIVE ✅
```
