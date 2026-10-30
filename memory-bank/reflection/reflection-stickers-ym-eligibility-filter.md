# Reflection: stickers-ym-eligibility-filter

**Task ID:** `stickers-ym-eligibility-filter` (расширение `stickers-yandex-market`)  
**Дата:** 2026-10-30  
**Сложность:** Level 1–2  
**Статус:** REFLECT

---

## Summary

Расширили срез заказов YM для `/stickers` с `PROCESSING/STARTED` до «до DELIVERY», включая задумку с `PENDING` и `READY_TO_SHIP`. Live API отверг часть фильтров; итоговая логика: **`POST …/orders` только `statuses: ['PROCESSING']`**, на клиенте **`STARTED` + `READY_TO_SHIP`**.

---

## What Went Well

- Парсинг `errors[]` YM (`BAD_REQUEST: …`) сразу показал корень: `Statuses [PENDING] are not allowed`.
- Один запрос + client-side substatus filter стабильнее двух запросов с `substatuses` в body (раньше был голый HTTP 400).
- `isYmStickerEligible()` — явная точка для тестов и будущих правил.

---

## Challenges

1. **Дока vs FBS API:** в enum есть `PENDING`, но фильтр `statuses: ['PENDING']` для FBS business orders **запрещён**.
2. **Двойной запрос** `PENDING` + `PROCESSING`/`substatuses` — 400 без текста до фикса парсера ошибок.
3. **Путаница status/substatus:** пользователь ожидал «PENDING как в ЛК»; для FBS новые заказы чаще сразу `PROCESSING/STARTED`.

---

## Lessons Learned

- Для YM **всегда** показывать `errors[].message` в UI, не axios default.
- Не переносить «логические» статусы из product brief в API filter без probe: `getBusinessOrders` ограничивает допустимые `statuses` по модели (FBS).
- `READY_TO_SHIP` безопасно включать через широкий `PROCESSING` + client filter, без `substatuses` в POST body.

---

## Technical Outcome

| Попытка | Результат |
|--------|-----------|
| `PROCESSING` + `substatuses: ['STARTED']` | OK (исходник) |
| Отдельно `PENDING` + `PROCESSING`+substatuses | 400 |
| `PENDING` + `PROCESSING` в одном запросе | `BAD_REQUEST: Statuses [PENDING] are not allowed` |
| **`PROCESSING` only + filter STARTED \| READY_TO_SHIP** | **Целевое решение** |

Файлы: `ymLabelsService.ts`, `stickersShared.ts` (parse errors), `StickersPage.tsx`, `ymLabelsService.test.ts`.

---

## Next Steps

- Страница `/orders` для YM по-прежнему только `STARTED` — выровнять с stickers при необходимости.
- Если понадобятся заказы «как PENDING в UI» — смотреть другую модель/endpoint, не `statuses: PENDING` на FBS.

→ `/archive` (опционально объединить с `stickers-yandex-market`)
