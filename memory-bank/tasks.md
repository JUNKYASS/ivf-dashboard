# Memory Bank: Tasks

## Текущая задача: `galtex-copy-article-sort`

**Сложность:** Level 1  
**Страница:** `/orders` — копирование артикулов Galtex  
**Статус:** REFLECT COMPLETE ✅

### Цель
При копировании артикулов поставщика Galtex сортировать по имени/артикулу (номер рисунка от меньшего к большему) после материала и плотности. Артикул поставщика — жирным при вставке.

### Чеклист
- [x] VAN — Level 1, прямой BUILD
- [x] Natural sort (`localeCompare` + `numeric: true`) для Galtex
- [x] Проброс `groupKey` в цепочку copy
- [x] Жирный `supplierArticle` в HTML-буфере (`<b>`)
- [x] `npm run build` ✅
- [x] Reflection: `memory-bank/reflection/reflection-galtex-copy-article-sort.md`

### Затронутые файлы
- `frontend/src/utils/fabricMaterial.ts`
- `frontend/src/components/OrderSupplierGroup.tsx`
- `frontend/src/utils/copyToClipboard.ts`

## Следующий шаг
→ `/archive`

---

## Завершённые задачи

| Task ID | Название | Сложность | Архив |
|---------|----------|-----------|-------|
| `warehouse-upload-ui-persist` | UI загрузки склада + персистентность | Level 2 | `memory-bank/archive/archive-warehouse-upload-ui-persist.md` |
| `parser-ozon-undefined-filter` | Фильтр `undefined` в Ozon-остатках | Level 1 | `memory-bank/archive/archive-parser-ozon-undefined-filter.md` |
| `orders-mobile-responsive` | Mobile-responsive `/orders` | Level 2 | `memory-bank/archive/archive-orders-mobile-responsive.md` |
| `orders-fabric-cut-roll` | Отрез / рулон в заказах | Level 3 | `memory-bank/archive/archive-orders-fabric-cut-roll.md` |
| `orders-warehouse-stock` | Остатки «Наш склад» на `/orders` | Level 2 | `memory-bank/archive/archive-orders-warehouse-stock.md` |
