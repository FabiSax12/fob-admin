One row of the events list: a gold serif date block on the left, the event's name, venue, start time and ticket chips beside it. Hand-written from `src/components/EventCard.tsx`.

**Use it** for "Próximos Eventos" and any list of dates. Stack rows directly; each draws a `color-fob-700` hairline under itself except the last. Rows, not cards.

**Props** (the `Event` content type)
- `date`: `"YYYY-MM-DD"`, rendered with `es-CR` locale (day, 3-letter month, year).
- `name`, `location: { name }`, `time: { start }`.
- `ticket: { presale?: { price }, regular: { price } }`: presale gets the amber-tinted "Preventa · ₡4.000" chip, regular a quiet chip ("₡6.000", "Privado").
- `passed`: overrides the automatic check (date before today). Added here for previews; the source always computes it.

A past event fades to 50%, strikes through its day and says *Gracias* on the right. On hover the name turns `color-fob-gold`.
