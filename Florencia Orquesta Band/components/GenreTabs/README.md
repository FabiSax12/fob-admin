A row of serif tabs that switch the repertoire between genres, with a gold underline that slides in under the selected one. Hand-written from the genre nav in `src/components/RepertoireCaroussel.tsx`, styled by `.genre-nav` / `.genre-btn` in `src/sections/RepertoireSection.astro`.

**Use it** to switch one panel of content between a handful of peer categories (Salsa, Merengue, Cumbia, Bolero, Bachata). The consumer renders the panel and listens with `onChange`.

**Props**
- `genres`: `[{ id, name }]` in display order.
- `value` (controlled) or `defaultValue` (default: the first genre).
- `onChange(id)`, `aria-label` (default "Géneros musicales"), `className`.

Unselected tabs are `color-fob-muted`, lifting to `color-fob-text` on hover. Tab names are single words in title case.
