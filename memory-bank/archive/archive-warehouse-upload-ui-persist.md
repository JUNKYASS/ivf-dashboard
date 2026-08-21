# TASK ARCHIVE: UI загрузки остатков склада + персистентность

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `warehouse-upload-ui-persist` |
| **Дата начала** | 2026-08-19 |
| **Дата архивации** | 2026-08-21 |
| **Сложность** | Level 2 |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/orders` |

---

## SUMMARY

Блок загрузки остатков нашего склада на `/orders` унифицирован с карточками поставщиков на `/parser`: зелёное состояние `has-file`, имя файла, подсказка «Нажмите, чтобы заменить файл». Состояние сохраняется после перезагрузки (API + sessionStorage). Мета-строка с датой и количеством позиций — под инпутом.

---

## REQUIREMENTS

1. UI загрузки как на `/parser` при загруженном файле.
2. Состояние `has-file` после перезагрузки страницы, пока файл на сервере.
3. Мета под инпутом: имя · N поз. · дата загрузки.
4. Предупреждение, если файл не загружен.

---

## IMPLEMENTATION

### Frontend

| Файл | Изменения |
|------|-----------|
| `frontend/src/components/FileUploadField.tsx` | `loadedFileName`, `loadedFileMeta`; `has-file` по серверному или локальному файлу |
| `frontend/src/components/OrdersSettingsBlock.tsx` | передача пропов; warning только при отсутствии файла |
| `frontend/src/pages/OrdersPage.tsx` | init из sessionStorage; sync после GET/POST; сброс `warehouseFile` после upload |
| `frontend/src/utils/warehouseStockDisplay.ts` | **новый** — cache, `getWarehouseStockDisplayName`, `getWarehouseStockMetaLine` |
| `frontend/src/styles/global.css` | `.file-upload-meta` |

### Поток данных

```
Reload → readStoredWarehouseStockStatus() → has-file сразу
      → GET /api/marketplace/warehouse-stock → актуальный статус → storeWarehouseStockStatus()
Upload → POST → setWarehouseStatus + store → warehouseFile = null
```

### UI при загруженном файле

```
✓ our stocks.xlsx
Нажмите, чтобы заменить файл
Остатки: our stocks.xlsx · 4 поз. · 10.08.2026, 02:26:45
```

---

## TESTING

| Проверка | Результат |
|----------|-----------|
| `npm run build` | ✅ |
| GET `/api/marketplace/warehouse-stock` | ✅ returns `exists: true` + meta |
| Ручная проверка reload + meta | ✅ |

---

## LESSONS LEARNED

1. Мета рендерить внутри `FileUploadField`, не снаружи.
2. `sessionStorage` убирает flash пустого состояния при reload.
3. После upload опираться на серверный статус, не на локальный `File`.

---

## REFERENCES

- Reflection: `memory-bank/reflection/reflection-warehouse-upload-ui-persist.md`
- Связанная задача: `orders-warehouse-stock` (базовая фича)
