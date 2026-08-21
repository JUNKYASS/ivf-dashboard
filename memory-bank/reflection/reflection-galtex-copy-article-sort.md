# Reflection: Galtex copy sort + bold supplier article

**Task ID:** `galtex-copy-article-sort`  
**Дата:** 2026-08-21  
**Сложность:** Level 1  
**Статус:** REFLECT завершён

---

## Summary

1. **Natural sort** артикулов Galtex при копировании (после материала/ширины/плотности) через `localeCompare` + `{ numeric: true }`.
2. **Жирное количество** при вставке в Word/Excel/Docs — `text/html` в буфере с `<b>` вокруг количества (`3 шт`, `5шт`), артикулы без выделения.

---

## What Went Well

- Сортировка расширена опцией `naturalArticleSort` без ломания других поставщиков.
- Rich clipboard с fallback на `contenteditable` + `execCommand` для HTTP.
- Plain text остаётся без разметки — совместимость с блокнотом/мессенджерами.

---

## Lessons Learned

`writeText` не поддерживает жирный — нужен dual-format clipboard (`text/plain` + `text/html`).

---

## Next Steps

→ `/archive`
