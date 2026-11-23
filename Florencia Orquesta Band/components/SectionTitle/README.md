The heading that opens every home-page section: Gloock in `color-fob-text` with a short amber rule beneath. Hand-written from `src/components/ui/SectionTitle.astro`.

**Use it** once per section, as its `h2`. The children are the title, with the main words capitalized ("Próximos Eventos", "Nuestros Músicos", "Sobre la Banda").

**Props**: `children`, `className`.

The rule is 56 × 1px `color-fob-amber`, 16px under the text; the block leaves 64px before the section's content. On the site the header also carries the `.reveal` scroll-in class; add it from the consumer if you use that system.
