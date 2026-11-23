The brand's signature button: an amber hairline outline with a gold label, for every main call to action. Hand-written from `src/components/ui/ThemedButton.astro`; the `arrow` variant from the hero CTA in `src/sections/Hero.astro`.

**Use it** for the one action a section leads to: "Reservá tu fecha", "Consultá disponibilidad", "Enviar mensaje". One per view, after the content has done its work. For dense UI inside React islands, use `Button` instead.

**Props**
- `href`: renders an `<a>`; without it, a `<button>`.
- `type`: button type when there's no `href` (default `"button"`; `"submit"` in forms).
- `arrow`: adds the 16px trailing arrow and the hero CTA's spacing (12px gap, 14px vertical padding, 2px corners, 12% / 80% amber on hover).
- `className`, `children` (the label, sentence case, voseo), plus any native attribute.

**Do**: keep the label short and in `color-fob-gold`. **Don't**: fill it solid, or put two side by side with equal weight.
