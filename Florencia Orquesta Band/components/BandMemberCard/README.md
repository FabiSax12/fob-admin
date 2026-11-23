A musician's 3:4 portrait over their name in Gloock and instrument in small uppercase. Hand-written from `src/components/BandMemberCard.astro`.

**Use it** in the musicians section, laid out as a staggered grid of varying column widths, never a grid of equal boxes. The consumer sets the card's width.

**Props**
- `image`: the portrait URL; the site falls back to `/placeholder.svg` (shown in the preview) when a musician has no photo yet.
- `name`: as the musician uses it ("Julio Salas").
- `instrument`: written in sentence case ("Director y Piano", "Voz"); CSS sets it uppercase.

On hover the photo scales to 1.04 over 700ms and an 8% amber veil fades in. Portraits are cropped from the top with 2px corners. Use real photos of the band, never stock.
