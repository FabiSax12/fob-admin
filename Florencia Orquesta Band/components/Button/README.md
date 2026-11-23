The shadcn/ui button (new-york style), mapped onto the FOB palette through the shadcn variables. Hand-written from `src/components/ui/button.tsx`.

**Use it** inside React islands and utility UI (carousel arrows, toolbars). For the brand's calls to action use `ThemedButton`; on the live site, Button only appears as the carousel's previous/next arrows.

**Props**
- `variant`: `default` (amber fill, dark text), `secondary`, `outline`, `ghost`, `link`, `destructive`.
- `size`: `default` (36px), `sm` (32px), `lg` (40px), `icon` (36 × 36).
- `disabled`, `className`, `children`, plus any native button attribute. Icons inside are sized to 16px.

The source's `asChild` (Radix Slot) is not reproduced here.

**Don't** put white text on `default`: `primary-foreground` is the dark ground. `destructive` text sits at 4.46:1, so keep its label at 14px medium or larger.
