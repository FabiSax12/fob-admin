# FOB Admin — Florencia Orquesta Band app

Objective: mobile-first serverless app to manage members, repertoire (PDF scores in S3), activities and per-musician setlist PDFs.
Branch: stacked slices (see L10) · Delivery: `ask-on-risk` → `chain_strategy=stacked-to-main` · Test runner: Vitest (`pnpm test`) · Package manager: pnpm.

## Specs

User request fragments are quoted verbatim (Spanish). Decisions from the clarification round are marked **[decision]**.

- **S1 — Users and roles.** "Usuarios: 1. Director (y musico) 2. Musicos 3. Sonidista". The director is also a musician (has a part). The sonidista has no part and gets no PDF: "Solamente ve el evento a los que va a asistir (no siempre llevamos a nuestro sonidista, es mas como un socio cuando el evento necesita tambien el sonido)".
- **S2 — Google identity.** "Tener el correo de google de cada musico para asi agendarles directamente las actividades en el calendario". **[decision]** Users log in with Google; only emails the director registered as members can enter.
- **S3 — Activity types.** "Tipos de actividades: 1. Ensayo General 2. Presentaciones 3. Seccionales (Percucion, Cantantes, Vientos, etc...)".
- **S4 — Sections.** **[decision]** The director creates sections and assigns musicians. When a Seccional is created, the attendee list is prefilled with that section's members.
- **S5 — Attendees.** **[decision]** "El director elige los convocados": when creating an activity the director marks who attends. Default: every musician. The sonidista is included only when explicitly marked. Only attendees see the activity, receive the invitation and get a PDF.
- **S6 — Repertoire in S3.** "Tener el repositorio de todo el repertorio (todo PDFs) en un Bucket S3". User rule, verbatim: "Primero se tendria que crear una cancion dentro del repertorio. Y el nombre de la cancion va a ser el nombre de la carpeta y dentro cada PDF tiene el nombre unicamente del instrumento." **[decision]** The PDF name is the *part* (for example `Trompeta 1.pdf`, `Trompeta 2.pdf`, `Bajo.pdf`). The S3 key is `repertorio/<song name>/<part>.pdf`. Each musician is assigned exactly one part name.
- **S7 — Setlist.** "El director puede crear una actividad de presentacion y escoger el orden de las canciones".
- **S8 — Personal PDF.** "para cada musico se va a tomar las partituras de su instrumento y se va a generar un UNICO PDF con todas esas cancines en Orden para que asi el musico no tenga que estar constantemente cambiando el Orden... Cuando un PDF de alguna partitura no esta disponible nada mas se agrega una pagina con el nombre de la cancion". Acceptance: for an ordered setlist [A, B, C] where the musician's part exists for A and C only, the output contains all pages of A's part, then one page showing the text of B's name, then all pages of C's part.
- **S9 — Publish effects.** "Al terminar de crear una presentacion en el sistema por el director entonces pasan 2 cosas: Los musicos pueden verlo dentro de la plataforma y en su calendario personal y tambien cada uno esta habilitado para descargar su PDF personal ya listo para tocar las canciones en ese orden..."
- **S10 — Calendar.** **[decision]** A Google account owned by the band creates the Google Calendar event and invites every attendee by email. The same applies to Ensayo General and Seccionales, without a PDF.
- **S11 — Mobile.** "La app debe estar pensada para uso mobile." Installable PWA, mobile-first layout.
- **S12 — Serverless.** "Si puede ser serverless mejor." **[decision]** TanStack Start on AWS via SST (Lambda + CloudFront), DynamoDB, S3, plus a separate async Lambda for PDF generation.

## Tasks

| ID | Task | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| T1 | Scaffold: TanStack Start + Tailwind + PWA, SST config (DynamoDB, S3, secrets), Vitest, lint/typecheck, README | S11, S12 | inline | done | ffd5475 |
| T2 | Domain model + DynamoDB repositories (members, sections, songs, activities) | S1, S3–S7 | inline | done | 0441a39 |
| T3 | Google login + member allow-list + role guards | S1, S2 | gentle-ai-worker + parent | done | a4cf155, d30c354 (slice `feat/fob-auth`) |
| T4 | Members and sections admin screens (director); last-director guard; login error codes | S1, S4, S6 | gentle-ai-worker | done | 91899b4, b734286 |
| T5 | Repertoire: create song, upload part PDFs via presigned URL, list parts | S6 | gentle-ai-worker | done | 7d8d20e |
| T6 | Activities: create/edit, attendees, mobile setlist ordering, list visible to attendees | S3, S5, S7, S9 | gentle-ai-worker | done | 8ce2d5e |
| T7 | PDF merge core (ordered parts + placeholder page), pure and unit-tested | S8 | gentle-ai-worker | done | 3213576 (slice `feat/fob-pdf-core`) |
| T8 | Publish: async effects Lambda (calendar sync + PDF per attendee), tracked PDF status, signed download | S8, S9, S10 | gentle-ai-worker | done | 6fe8768 |
| T9 | Google Calendar invites from band account on publish/update/cancel | S9, S10 | gentle-ai-worker | done | 249e93e |
| T10 | Deploy guide (Google Cloud setup, SST secrets incl. PublicUrl, first deploy, bootstrap first director via aws dynamodb put-item) | S2, S10, S12 | inline | done | see L16 |

## Log

- **L1 (user's original request, verbatim):**
  > Necesito crear una app con las siguientes caracteristicas...
  >
  > Florencia Orquesta Band es una agrupacion de musicos y musica bailable
  >
  > Usuarios:
  > 1. Director (y musico)
  > 2. Musicos
  > 3. Sonidista
  >
  > Tipos de actividades:
  > 1. Ensayo General
  > 2. Presentaciones
  > 3. Seccionales (Percucion, Cantantes, Vientos, etc...)
  >
  > Feaatures:
  > 1. Tener el correo de google de cada musico para asi agendarles directamente las actividades en el calendario
  > 2. Tener el repositorio de todo el repertorio (todo PDFs) en un Bucket S3
  > 3. El director puede crear una actividad de presentacion y escoger el orden de las canciones, eso va a disparar la feature mas importante y es que para cada musico se va a tomar las partituras de su instrumento y se va a generar un UNICO PDF con todas esas cancines en Orden para que asi el musico no tenga que estar constantemente cambiando el Orden... Cuando un PDF de alguna partitura no esta disponible nada mas se agrega una pagina con el nombre de la cancion
  >
  > Al terminar de crear una presentacion en el sistema por el director entonces pasan 2 cosas: Los musicos pueden verlo dentro de la plataforma y en su calendario personal y tambien cada uno esta habilitado para descargar su PDF personal ya listo para tocar las canciones en ese orden...
  >
  > La app debe estar pensada para uso mobile.
  >
  > Si puede ser serverless mejor.
- **L2 — Clarifications (user answers):** calendar via band account invitations; repertoire folder = song name with one PDF per part; parts assigned per specific part; sonidista only sees events he attends; director picks attendees; director manages sections; stack: "AWS esta bien pero proponme otro Stack para el APP" → "Si necesitamos API entonces estoy abierto a usar NextJS o Tanstack Start" → chose TanStack Start.
- **L3 — Rationale:** DynamoDB instead of the owner's PostgreSQL default because "serverless" was requested; Aurora Serverless has a non-trivial minimum cost for a small band app. PDF generation runs in its own async Lambda so publishing never blocks the request. Forecast: ~2,500–3,500 authored lines → exceeds 400; delivery strategy `ask-on-risk` asks before the next commit when it matters.
- **L4 — Mirror:** Engram mirror `odd/fob-admin-app/tasks` is pending: the local engram binary predates v2.0.0-rc.11 and the provider failed to initialize.
- **L6 — User correction (verbatim):** "Primero que nada quiero que sepas que vamos a usar el System Design de Claude llamado "Florencia Orquesta Band" que de hecho usa "SHADCN" de base". UI must use that design system on top of shadcn/ui; its location is still unknown. The dependency list is pending a decision between arctic and Cognito.
- **L7 — User decision (verbatim):** "Vamos con Artic @"Florencia Orquesta Band/"". Auth uses arctic (Google OAuth) plus our own signed-cookie session; Cognito is rejected. The design system lives in `Florencia Orquesta Band/` (exported Claude design system: tokens.css/json, component previews, assets, logos, app icons).
- **L8 — T1 evidence:** `pnpm build` produced `.output/nitro.json` with preset `aws-lambda`; `pnpm check` passed (Biome, tsc, Vitest with no tests yet). PWA uses a static `public/manifest.webmanifest` instead of vite-plugin-pwa, which does not fit SSR Start cleanly (install does not need a service worker). Devtools packages removed. Native assess of root commit ffd5475: unavailable (no base commit to compare against). Next review base: ffd5475.
- **L9 — T2 evidence:** RED: 4 test files failed to import missing modules. GREEN: `pnpm check` → 34 tests passed in 4 files, Biome and tsc clean. The DynamoDB repository (single table, gsi1 for listing) has no unit test (it needs DynamoDB Local); it gets functional verification on the first `sst dev`. `sst-env.d.ts` was handwritten to match `sst.config.ts`; SST regenerates it on `sst dev`. Assumptions recorded in code: a song name is immutable because it is the S3 folder name; a presentation needs at least one song to publish; editing a published activity re-runs its publish effects. Native assess of 0441a39 (base ffd5475): tier medium, reviewDue false, `under_budget`; the boundary stays pending at ffd5475. Running count is ~1,290 authored lines, over 400, so `ask-on-risk` asks for the delivery shape.
- **L10 — Delivery (user choice):** "Cadena directa a main" → `chain_strategy=stacked-to-main`. The repo has no remote and `main` is unborn (no commits), so the default branch cannot be verified yet; it is assumed to be `main` once the remote exists. Slices are stacked local branches: slice 1 `feat/fob-domain` = ffd5475, 0441a39 (T1, T2); slice 2 `feat/fob-auth` (T3). Push and PR creation remain the user's decision.
- **L11 — T3/T7 evidence:** The T3 worker hit its edit-surface limits; the parent removed the old `src/routes/index.tsx` and wrote the thin `/auth/*` route wrappers. `pnpm check` passed (50 tests across the stack). `pnpm build` passed, and `.output/public` contains no server SDK or secret markers. Independent gentle-ai-verify on a4cf155 found no blockers; S1 and S2 are met in code, but the real Google flow is unverified until deploy. The verifier's should-fix was applied in d30c354: the OAuth redirect_uri is pinned to the `PublicUrl` secret, plus a regression test for forged payloads. T7 worker: 7 tests, RED then GREEN, including the S8 acceptance example. Assess a4cf155 (base ffd5475, escalate item 2): tier high, reviewDue true.
- **L12 — Native review:** lineage `review-e823a622286a7672`, base ffd5475..d30c354, lenses risk + reliability → approved; authority burned. The next review base is d30c354. Non-blocking advisory findings are assigned to later tasks: R1-001 login error text spoofing → T4 (map error codes); R1-002 GET logout and R1-003 stateless logout → accepted for now; R3-last-director-lockout → T4; R3-no-bootstrap-director → T10; R3-oauth-callback-untested → accepted, needs SST mocks; R3-publish-persist-before-effects → T8 (async effects with tracked status).
- **L13 — T4/T9 evidence:** Workers ran in parallel. T4: RED then GREEN on the last-director guard and the login error-code mapping, which closes review findings R3-last-director-lockout and R1-001. T9: 15 tests with a fake gateway; the Google gateway itself is unverified until deploy. `sst-env.d.ts` was blanked by a tool during the run and the parent restored it. The parent ran `pnpm check`: 73 tests pass. Slice `feat/fob-admin-calendar`: 249e93e, 91899b4, b734286. Native review of d30c354..b734286 was refused twice with `lens_context_budget_exceeded`, because of the lockfile and the size. The T4 commit was split into a build commit (91899b4: shadcn primitives plus lockfile) and a logic commit (b734286). Native review of b734286 alone (lens risk) → approved, no findings, lineage `review-2eeedd8a76c5309b`. 249e93e (calendar) and 91899b4 (ui/deps) got no native review; they were self-verified by tests and build. Next review base: b734286.
- **L14 — T5/T6 evidence:** T5: RED then GREEN on part-name parsing and accent-insensitive search; S3 adapter and UI unverified without AWS or a browser. T6: RED then GREEN on schedule (-06:00), setlist reordering and upcoming/past helpers; an end time earlier than the start means the activity ends the next day (gigs past midnight); the setlist picker hides songs already added. The parent ran `pnpm check`: 110 tests pass; build OK. Slice `feat/fob-repertoire-activities`: 7d8d20e, 8ce2d5e. Assess against base b734286: medium, reviewDue false (`under_budget`); the boundary stays pending at b734286.
- **L15 — T8 design:** On publish (and on edits while published), the web Lambda invokes an async `PublishEffects` Lambda (InvocationType Event). That Lambda syncs the Google Calendar event and, for presentations, builds one PDF per attendee with a part. It records a per-member PDF status (pending/ready/failed), which addresses review finding R3-publish-persist-before-effects. Downloads go through a presigned GET that only attendees of a published activity can get.
- **L16 — T8/T10 evidence:** T8: RED then GREEN, 20 publishing tests. The parent ran `pnpm check`: 130 tests in 16 files pass; build OK; `.output/public` has no AWS SDK markers. The parent bundled `functions/publish-effects.ts` with esbuild 0.25 and tsconfig paths: OK (2.7 MB). Assess 6fe8768 against base b734286: medium, reviewDue false (`under_budget`). Known gaps: a PDF stays `pending` forever if the async invoke or the Lambda fails, and the UI keeps polling every 5 s; the calendar retry may duplicate an event if saving its id fails; a song can appear only once per setlist (UI). T10: `docs/deploy.md` covers Google Cloud, secrets incl. PublicUrl, first deploy, bootstrapping the first director (review finding R3-no-bootstrap-director) and repertoire naming.
- **L17 — Close:** Every task is done in code. Not verified end to end: no deploy was run, because it needs the user's Google credentials and permission to deploy to their AWS account. The real Google login, Calendar invitations, S3 uploads and downloads, the async Lambda and the mobile UI are unverified in a browser and on AWS. Engram mirror still pending (L4).
- **L5 — Next step (superseded by L8):** confirm the dependency list (owner policy: ask before adding dependencies), then T1.
