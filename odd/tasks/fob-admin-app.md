# FOB Admin — Florencia Orquesta Band app

Objective: mobile-first serverless app to manage members, repertoire (PDF scores in S3), activities and per-musician setlist PDFs.
Branch: `feat/fob-admin-app` · Delivery: `ask-on-risk` · Test runner: Vitest (`pnpm test`) · Package manager: pnpm.

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
| T2 | Domain model + DynamoDB repositories (members, sections, songs, activities) | S1, S3–S7 | inline | pending | |
| T3 | Google login + member allow-list + role guards | S1, S2 | inline | pending | |
| T4 | Members and sections admin screens (director) | S1, S4, S6 | inline | pending | |
| T5 | Repertoire: create song, upload part PDFs via presigned URL, list parts | S6 | inline | pending | |
| T6 | Activities: create/edit, attendees, mobile setlist ordering, list visible to attendees | S3, S5, S7, S9 | inline | pending | |
| T7 | PDF merge core (ordered parts + placeholder page), pure and unit-tested | S8 | inline | pending | |
| T8 | Publish: async PDF Lambda per attendee, S3 output, signed download | S8, S9 | inline | pending | |
| T9 | Google Calendar invites from band account on publish/update/cancel | S9, S10 | inline | pending | |
| T10 | Deploy guide (Google Cloud setup, SST secrets, first deploy) | S2, S10, S12 | inline | pending | |

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
- **L5 — Next step (superseded by L8):** confirm the dependency list (owner policy: ask before adding dependencies), then T1.
