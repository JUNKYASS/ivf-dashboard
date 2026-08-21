# TASK ARCHIVE: Galtex copy — natural sort + bold qty

## METADATA

| Поле | Значение |
|------|----------|
| **Task ID** | `galtex-copy-article-sort` |
| **Дата архивации** | 2026-08-21 |
| **Сложность** | Level 1 |
| **Статус** | COMPLETED & ARCHIVED |
| **Страница** | `/orders` — копирование артикулов Galtex |

---

## SUMMARY

1. Natural sort артикулов Galtex при копировании (`localeCompare` + `{ numeric: true }`) после материала/плотности.
2. Жирное количество в HTML-буфере (`<b>` вокруг qty); plain text без разметки.

---

## KEY FILES

- `frontend/src/utils/fabricMaterial.ts`
- `frontend/src/components/OrderSupplierGroup.tsx`
- `frontend/src/utils/copyToClipboard.ts`

---

## REFERENCES

- Reflection: `memory-bank/reflection/reflection-galtex-copy-article-sort.md`
