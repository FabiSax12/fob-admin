Florencia Orquesta Band (FOB) is a tropical dance orchestra from Florencia, San Carlos, Costa Rica. The site sells live music for weddings, quinceañeras, corporate events and graduations to organizers who arrive hopeful and a little overwhelmed. Everything here exists to make them *feel the band before they call*.

## Brand personality

**Elegante, nocturno, cálido.** Refined, nighttime, warm. Picture 9 p.m., warm amber lights, the first notes of a salsa hitting the dance floor. The voice is a premium entertainment agency's: professional and clear, never cold. Think tropical warmth in a tailored suit.

Five principles decide every layout:

1. **Every element should feel like 9 p.m.** Dark amber-tinted grounds, warm light, the moment before the music starts.
2. **Trust through restraint.** Premium means knowing what not to show. Generous whitespace beats packed content.
3. **Music and musicians are the heroes.** Who they are and what they play gets center stage, not decoration.
4. **Emotion before conversion.** Make the visitor feel first. The call to action comes after the feeling.
5. **Suit, not sequins.** Joyful but composed. A little warmth goes a long way.

**Not this:** generic music templates, party-flyer or neon-club looks, stock-photo agency sites, Bootstrap-era grids, purple-blue "AI dark mode" glows, gradient text, side-stripe borders, grids of equal boxes, bounce animations.

## Content fundamentals

- Write in Costa Rican Spanish (`lang="es"`, locale `es_CR`) and address the visitor with **voseo**: "Reservá tu fecha", "Consultá disponibilidad", "Enviar consulta".
- Section titles capitalize their main words ("Nuestros Músicos", "Próximos Eventos", "Sobre la Banda"). Buttons, kickers and sub-headings use sentence case ("Reservá tu fecha", "Acerca del evento", "Entradas"). Uppercase only in the `eyebrow` and `instrument-label` styles, and those are set in CSS, never typed in capitals.
- The tagline is **"Creando momentos a través de la música"**. Use it in the hero and wherever one line has to carry the brand.
- Short, warm, specific. A past event simply says *Gracias*; a ticket chip reads "Preventa · ₡4.000". No exclamation-mark hype, no emoji.
- Dates are written the Costa Rican way, from `toLocaleDateString("es-CR")`: day numeral, three-letter month, year.

## Color

The site has a single **dark** theme (`html { color-scheme: dark }`, class `dark` on `<html>`). There is no light mode; don't add one.

- **Surfaces** step up from `color-fob-950` (page ground) through `color-fob-900` (cards, popovers), `color-fob-800` (quiet fills, inputs), `color-fob-700` (hairlines) to `color-fob-600`. All are tinted toward amber (hue ≈ 50). Never use pure black.
- **Text:** `color-fob-text` for headings and primary copy; `color-fob-subtle` for secondary lines (locations, descriptions, instrument labels). `color-fob-muted` is only 2.5:1 on the ground, so keep it to meta a visitor can afford to miss (a year, the scroll cue). It's kept exact from the source.
- **Accents** run from the logo's warm ramp: `color-fob-gold` → `color-fob-amber` → `color-fob-copper`. Gold carries numerals, titles and button labels. Amber is the structural accent: the 56 × 1px rule under section titles, button borders, focus rings. Copper is the deepest note; use it sparingly.
- Accents usually appear as **light, not paint**. Amber at 40% for resting borders, 100% on hover, and 8–12% as a tint behind hovered controls or over a portrait. A solid amber fill (`primary`) takes dark `primary-foreground` text, never white.
- No cyan, no purple, no neon, no gradient text.
- Gradients only darken or fade, always in the ground's own hue: `gradient-hero-overlay` over the hero photo, `gradient-event-overlay` over an event cover, `gradient-event-fallback` when an event has no image, and `gradient-fade-start` / `gradient-fade-end` at the edges of a scrolling row. Never a colored gradient fill, never on text.
- The shadcn variables (`background`, `foreground`, `card`, `primary`, `border`, `ring` …) map onto the FOB palette with the same values. Use them inside shadcn components and the `color-fob-*` tokens everywhere else.

## Typography

- **Gloock** (`serif`) is the display face: venue marquee meets printed event program. It sets every heading, date numeral, member name and the italic `lede`. It has one weight (400), so don't reach for bold.
- **Figtree** (`sans`) sets body, labels and buttons, loaded at 300, 400, 500 and 600. Body is `body`: 16px with a 1.65 line height.
- Both load from Google Fonts: `https://fonts.googleapis.com/css2?family=Gloock&family=Figtree:wght@300;400;500;600&display=swap`.
- Headings are fluid. Each style's size is its `clamp()` maximum, and the usage note gives the full clamp. Display styles tighten tracking (`-0.01em` to `-0.025em`); small sans labels open it up (`0.08em`–`0.1em`) and go uppercase.
- Pair a `section-title` with the amber rule: 16px below the heading, 56px wide, 1px tall, `color-fob-amber`.
- A `date-numeral` is always `color-fob-gold`, stacked over an `eyebrow` month in `color-fob-subtle` and the year in `color-fob-muted`.

## Layout and spacing

There's no spacing scale of its own; the site uses Tailwind's default 4px scale plus a few fluid paddings:

- Section padding: `clamp(3rem, 6vw, 5rem)` top and bottom, with an extra `clamp(4rem, 8vw, 7rem)` at the very end of a page.
- Page gutters: `clamp(1.5rem, 5vw, 3rem)`.
- Section titles sit 64px (`mb-16`) above their content.
- Event lists are **rows, not cards**: 32px vertical padding, separated by `color-fob-700` hairlines, date block on the left.
- Musicians use a **staggered grid** of varying column widths with 3:4 portraits, not a grid of equal boxes.
- Long text is capped (`max-width: 46rem` for descriptions, `38ch` for intros).

## Radii, borders and depth

- Brand pieces are nearly square: **2px** corners on portraits and ticket chips, `rounded-sm` on the outline button. Rounding here comes from tailoring, not softness.
- shadcn controls use `radius` (0.4rem); Tailwind derives `rounded-sm`, `rounded-lg` and `rounded-xl` from it.
- Borders are 1px hairlines in `color-fob-700` (`border` in shadcn). Separate with hairlines and space, not shadows. The only glow allowed is a warm amber tint.

## Buttons and states

- The signature button is an **outline**: `color-fob-amber` border at 40%, label in `color-fob-gold` (`button` style), 32 × 12px padding. On hover the border goes to full amber and a 10% amber tint fills it.
- Focus: a 2px ring in `color-fob-amber` at 50% on custom controls, `ring` at 50% as the global outline. Solid amber reads 8:1 on the ground.
- Hover on content is quiet: event titles turn gold, portraits scale to 1.04 over 700ms under an 8% amber veil.
- Past events drop to 50% opacity with the numeral struck through.

## Motion

- Content rises into place: `.reveal` fades in from 28px below over 0.75s on `cubic-bezier(0.16, 1, 0.3, 1)`, staggered in 80ms steps (`reveal-delay-1` … `-8`).
- The hero logo floats 18px over 6s, ease-in-out, forever (`animate-float`).
- Under `prefers-reduced-motion: reduce`, reveals show at once with no transition.
- Nothing bounces, except the small scroll cue under the hero.

## Imagery

- Photography of the real band and its stages carries the page: a full-bleed hero under a dark overlay, then the musicians' portraits. Use real musicians, never stock.
- Portraits are 3:4, cropped from the top (`object-top`), with 2px corners.

## Logos

See the **Logos** asset group. The mark is a full-color illustration (congas, saxophone and trumpet behind a black-outlined "Florencia" wordmark), so it only goes on the dark grounds. Never recolor it, outline it or redraw it.

- `logo_simple` is the primary lockup, used in the hero at `min(520px, 80vw)` wide. Prefer the `.webp`.
- `logo.png` is the fuller version with music notes rising from the drums.
- `FOB_Logo.webp` is the structured-data and social logo.

## Components

Load `components/bundle.css` and `components/bundle.js` after React 18; everything is on `window.FOB`. Each card's README says what the consumer passes in.

- **Calls to action:** `ThemedButton`, the amber outline with a gold label. Use `arrow` for the hero's "Reservá tu fecha". One per view.
- **Utility actions:** `Button` (shadcn variants `default`, `secondary`, `outline`, `ghost`, `link`, `destructive`) inside React islands only.
- **Forms:** `TextField`, label above, `prefix` for "+506". Confirm the result with `MessageDialog`.
- **Lists of dates:** `EventCard` rows. **People:** `BandMemberCard` in a staggered grid. **Contained blocks:** `Card`, sparingly.
- **Headings:** `SectionTitle` opens each section; `TextGradient` lights one key word in gold.
- **Switching content:** `GenreTabs`.

## Iconography

- The UI icon set is **Lucide** (`lucide-react` in React islands, `astro-icon` with `lucide--*` SVGs in Astro). Draw at 24px on a 2px stroke with round caps and joins, colored by `currentColor`.
- Only `calendar` and `map-pin` are vendored as files; the rest come from the package.
- Custom inline glyphs follow Lucide's line style, like the hero's 16px arrow on a 1.5px stroke.
- The app and favicon artwork is a pair of congas (see **App icons**). No emoji as icons.

## Not synced

Taken from `FabiSax12/fob-landing` at `main@2aa06c9`. Left out:

- **Components** are hand-written from the repo's source (the repo's build was not run), with its exact values; each README names its source file. Not included: shadcn's `Carousel` (needs Embla), `SocialMediaLink` (unused, and off-palette Tailwind grays), and the section-level pieces (Hero, Footer, carousels of songs and reviews).
- **Gradients.** The yellow → orange → red Tailwind gradients in `EventDetails.astro`, `EventLocationMap.astro` and `Repertoire.astro` predate the palette and break the no-gradient-text rule, so they aren't tokens.
- **Font files.** Gloock and Figtree are Google-hosted; the repo has no files to copy.
- **Derived variables.** The `@theme inline` aliases (`--color-background: var(--background)` and the rest) duplicate the shadcn tokens. `--radius-sm`, `--radius-lg` and `--radius-xl` are `calc()` expressions. `--animate-float` is motion and lives in the Motion section.
- **Assets.** `public/favicon.svg` is Astro's default mark, not FOB's. `favicon.ico` is a format the asset library doesn't store. `placeholder.svg`, `hero.png`, `Congas.png` and the photos were left out by choice.
- **Off-palette literals.** One color appears outside the tokens: `oklch(0.87 0.010 70)` for event descriptions. The `tailwindcss` grays and oranges on `SocialMediaLink` and the old event page predate the palette.
