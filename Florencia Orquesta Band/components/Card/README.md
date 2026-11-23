The shadcn/ui card: a `card` surface with a 1px `border` hairline and soft corners, split into header, title, description, content and footer parts. Hand-written from `src/components/ui/card.tsx`.

**Use it** for a contained, self-standing block (a service package, a summary). It's installed but not used on the live site. The brand's own lists are rows and portraits (`EventCard`, `BandMemberCard`), not grids of equal boxes, so reach for those first.

**Parts**: `Card`, `CardHeader` (24px padding), `CardTitle` (Figtree 600), `CardDescription` (14px, `muted-foreground`), `CardContent`, `CardFooter`. Each takes `className`, `children` and native div attributes.

Corners are `radius` + 6px. That's rounder than the brand's 2px pieces, so keep cards to secondary UI.
