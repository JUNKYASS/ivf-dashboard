# Creative: Отрез / рулон в заказах

**Feature:** `orders-fabric-cut-roll`  
**Дата:** 2026-08-10  
**Статус:** Решения приняты

---

## 🎨🎨🎨 ENTERING CREATIVE PHASE: ALGORITHM + UI/UX

### Требования (от заказчика)

1. Классификация **только по артикулу**, `productTitle` не используется.
2. Длина в метрах — сегмент артикула **сразу после кода материала** (BZ, ST, PP…).
3. **Отрез:** длина ≤ 20 м. **Рулон:** длина > 20 м.
4. Тканевая карточка: первый префикс артикула ∈ префиксам поставщиков ткани (`SUPPLIER_PREFIX_CONFIG`).
5. Компактные **бейджи** «отрез» / «рулон».
6. **Отдельные кнопки Copy** для отрезов и рулонов.
7. **Постельное бельё** — без изменений.
8. **Без сопоставления** — разделение только для тканевых карточек; нетканевые — как сейчас.

---

## Решение 1: Алгоритм классификации

### Выбранный подход

Единая функция на **backend** (и shared-утилита для frontend при необходимости):

```ts
type FabricSaleType = 'cut' | 'roll';

const FABRIC_CUT_MAX_LENGTH_M = 20;

function isFabricSupplierPrefix(article: string): boolean {
  const prefix = getArticlePrefix(article); // первый сегмент до '-'
  return prefix in SUPPLIER_PREFIX_CONFIG;
}

function parseFabricLengthMeters(article: string): number | null {
  const segments = article.split('-').map(s => s.trim()).filter(Boolean);
  const upper = segments.map(s => s.toUpperCase());

  // Найти индекс кода материала (OXF600D, SPST, SST, … BZ, PP, ST)
  let materialIndex = -1;
  for (const code of FABRIC_MATERIAL_CODE_ORDER) {
    const idx = upper.indexOf(code);
    if (idx !== -1) {
      materialIndex = idx;
      break;
    }
  }
  if (materialIndex === -1) return null;

  const lengthRaw = segments[materialIndex + 1];
  if (!lengthRaw || !/^\d+$/.test(lengthRaw)) return null;

  return Number.parseInt(lengthRaw, 10);
}

function classifyFabricSaleType(article: string): FabricSaleType | null {
  if (!isFabricSupplierPrefix(article)) return null;

  const lengthM = parseFabricLengthMeters(article);
  if (lengthM === null) return null;

  return lengthM <= FABRIC_CUT_MAX_LENGTH_M ? 'cut' : 'roll';
}
```

### Примеры

| Артикул | Материал | Длина | Тип |
|---------|----------|-------|-----|
| `gt-220120-bz-8-jungleturqgreen` | bz | 8 | **отрез** |
| `gt-150120-bz-50-zaikiwhiteblue` | bz | 50 | **рулон** |
| `td-220120-st-33-zabveniekomp2` | st | 33 | **рулон** |
| `td-220120-st-8-blossomdreamsosn2` | st | 8 | **отрез** |
| `gt-150140-m-bz-8-svetlogoluboi` | bz (после `m`) | 8 | **отрез** |
| `SHF-...` | — | — | не ткань (bedding) |
| `MT-...` | — | — | не ткань (unmapped) |

### Отклонённые варианты

| Вариант | Почему отклонён |
|---------|-----------------|
| Классификация по `productTitle` | Явное требование заказчика: только артикул |
| Длина из сегмента `150140` | Это ширина+плотность, не метраж |
| Порог 8 м = отрез | Не соответствует бизнес-правилу (≤20 м) |

### Поле в модели данных

```ts
// OrderRow
fabricSaleType: 'cut' | 'roll' | null;
// null = не ткань ИЛИ ткань без распознанной длины
```

Вычисляется в `ordersService` при сборке `OrderRow`. `productTitle` не читается.

### Ткань без длины (краевой случай)

Если префикс тканевый, но длина не распознана → `fabricSaleType: null`, **без бейджа**, строка попадает в секцию **«Прочее»** (см. UI) с одной кнопкой «Скопировать».

---

## Решение 2: UI / UX

### Выбранный вариант: подсекции внутри поставщика

Внутри `OrderSupplierGroup` (без вложенных `CollapsibleSection` — экономия места):

```
┌─ Galtex (12 поз., 15 шт.) ─────────────────────────┐
│ [Скопировать отрезы]  [Скопировать рулоны]         │  ← только если есть оба типа
│                                                      │
│ Отрезы (5 поз.)                                      │
│ ┌ таблица ─────────────────────────────────────┐  │
│ │ GT-BZ-... [отрез]  │ ... │ 2 │ 0 │ postings  │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ Рулоны (7 поз.)                                      │
│ ┌ таблица ─────────────────────────────────────┐  │
│ │ GT-BZ-... [рулон]  │ ... │ 1 │ 3 │ postings  │  │
│ └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Почему не вкладки:** лишний клик для оператора; оба списка часто нужны одновременно.

**Почему не две CollapsibleSection:** избыточная вложенность; подзаголовок + таблица компактнее.

### Бейджи

**Размещение:** inline в ячейке артикула, **после кода**, в одной строке с `order-article-code`.

```html
<span class="order-article-code">gt-220120-bz-8-...</span>
<span class="fabric-type-badge fabric-type-badge-cut">отрез</span>
```

**Стили:**
- `font-size: 11px`, `padding: 1px 6px`, `border-radius: 4px`
- отрез: нейтральный/синий фон
- рулон: нейтральный/янтарный фон
- не занимает отдельную колонку → таблица не сужается

### Кнопки Copy

| Группа | Кнопки |
|--------|--------|
| Поставщики (galtex, td, …) | «Скопировать отрезы» + «Скопировать рулоны» (+ «Скопировать прочее» если есть) |
| Постельное бельё | Без изменений: одна кнопка marketplace |
| Без сопоставления | Нетканевые: одна кнопка marketplace. Тканевые: отрезы + рулоны (+ прочее) |

Фильтрация copy: `rows.filter(r => r.fabricSaleType === 'cut')` и аналогично для `roll`.  
Логика склада (`warehouseStockEnabled`) сохраняется.

### Группа «Без сопоставления»

```
┌─ Без сопоставления ─────────────────────────────────┐
│ [Скопировать артикулы маркетплейса]  ← нетканевые    │
│ ┌ таблица нетканевых (MT, …) ─────────────────────┐ │
│                                                      │
│ [Скопировать отрезы] [Скопировать рулоны]            │
│ Отрезы / Рулоны / Прочее (только isFabricSupplierPrefix)│
└──────────────────────────────────────────────────────┘
```

Порядок секций: сначала нетканевые (если есть), затем тканевые подсекции.

---

## Решение 3: Размещение кода

| Модуль | Ответственность |
|--------|-----------------|
| `backend/src/services/fabricSaleTypeService.ts` | **новый** — `classifyFabricSaleType`, `isFabricSupplierPrefix` |
| `backend/src/services/ordersService.ts` | заполнение `fabricSaleType` в `OrderRow` |
| `shared` или дубль в `frontend/src/utils/fabricSaleType.ts` | те же функции для UI-фильтрации (или импорт через общий пакет — **дубль в frontend**, как `normalizeArticle`) |
| `OrderSupplierGroup.tsx` | подсекции, бейджи, кнопки copy |
| `global.css` | `.fabric-type-badge`, `.orders-fabric-subsection` |

Константу `FABRIC_CUT_MAX_LENGTH_M = 20` — в `constants.ts` (backend), продублировать или экспортировать в types.

---

## Guidelines для BUILD

1. Добавить `fabricSaleType` в `OrderRow` (backend + frontend types).
2. Не менять `OrderGroup` структуру — фильтрация на уровне UI по `fabricSaleType`.
3. `copyMarketplaceArticles` для bedding остаётся `true`; для unmapped — гибрид (нетканевые = marketplace, тканевые = supplier copy если есть `supplierArticle`, иначе marketplace).
4. Пустые подсекции не рендерить (если нет отрезов — не показывать блок «Отрезы»).
5. Кнопки copy disabled/скрыты если в подсекции 0 строк.

---

## Verification

| Критерий | Выполнено |
|----------|-----------|
| Только артикул | ✅ |
| Длина после материала | ✅ |
| Порог ≤20 м = отрез | ✅ |
| Префикс поставщика = ткань | ✅ |
| Бейджи компактные | ✅ |
| Отдельный Copy | ✅ |
| Bedding без изменений | ✅ |
| Unmapped: только ткань | ✅ |

## 🎨🎨🎨 EXITING CREATIVE PHASE

**Следующий шаг:** `/plan` — детальный план BUILD.
