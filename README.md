# FOB Admin

Mobile-first app for **Florencia Orquesta Band**: members, sections, repertoire (PDF scores in S3), activities, and the personal setlist PDF each musician downloads before a show.

## Stack

| Layer | Choice |
| --- | --- |
| App | TanStack Start (React 19, file routes, server functions), Tailwind v4, shadcn/ui |
| Design | `Florencia Orquesta Band/` design system (tokens mirrored in `src/styles.css`) |
| Infra | SST on AWS: TanStack Start on Lambda + CloudFront, DynamoDB, S3 |
| Auth | Google OAuth via `arctic`, signed cookie session, member allow-list |
| PDFs | `pdf-lib` in an async Lambda |
| Calendar | Google Calendar invitations from the band account |

## Commands

```bash
pnpm install
pnpm dev          # local app without AWS resources (http://localhost:3000)
pnpm sst dev      # local app linked to your personal AWS stage
pnpm test         # unit tests (Vitest)
pnpm check        # Biome + typecheck + tests
pnpm sst deploy --stage production
```

## Layout

```
src/
  routes/        file routes (UI + server function wiring)
  features/      domain features: members, songs, activities, auth, pdf, calendar
  components/ui  shadcn primitives themed with FOB tokens
functions/       standalone Lambdas (PDF generation)
tests/           Vitest, mirrors src/
```

Deployment and Google Cloud setup: see `docs/deploy.md`.
