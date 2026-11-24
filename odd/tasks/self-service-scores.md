# Self-service scores — each musician uploads their own part PDFs

Objective: let every musician with a part walk the repertoire song by song and upload (or skip) the PDF of their own part, so the director does not upload >40 songs alone.
Branch: `feat/self-service-scores` · Test runner: Vitest (`pnpm check`) · Builds on `odd/tasks/fob-admin-app.md` (S6 storage layout).

## Specs

- **S1 — Song-by-song wizard.** "irle presentando cancion por cancion, con botones de anterior y siguiente."
- **S2 — Two choices.** "Tiene 2 opciones, subir un PDF o escoger la opcion de "Saltar porque no lo tengo" y poder continuar con las demas."
- **S3 — Automatic rename.** "Como la persona en su perfil ya tiene el instrumento el mismo sistema va a renombrar el PDF indepentientemente del nombre con el que se suba." The file is stored at `repertorio/<song>/<member part>.pdf` whatever its original name; the client never chooses the part.
- **S4 — Preview.** "Debe tener vista previa de la primera pagina". Rendered with pdfjs-dist **[decision L2]**, both for the picked file and for an existing PDF.
- **S5 — Existing PDF.** **[decision L2]** When the member's part already has a PDF for the song, the wizard shows it with "Reemplazar" or "Siguiente". The wizard starts at the first song that has neither a PDF nor a skip.
- **S6 — Persisted skip.** **[decision L2]** "Saltar porque no lo tengo" is stored per member and song. Returning to the wizard resumes from pending songs; uploading a PDF clears the skip. The director sees on each song who said they do not have it.
- **S7 — Who.** Every member with a part (director and musicians); the sonidista has no part and gets no wizard.

## Tasks

| ID | Task | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| T1 | Score collection service: progress, skip, upload URL for own part, skips per song; Dynamo wiring; server functions | S2, S3, S5, S6, S7 | inline | done | f78f9ee |
| T3 | Review fixes: staged upload + server confirm (size ≤ 20 MB, `%PDF-` header) before replacing; skip cleared only after confirm; S3 versioning + lifecycle (staging 1 day, old versions 30 days); skippedBy filter in the service with tests | S3, S6 | inline | done | c2f9c5a |
| T4 | Review fix R3-promote-delete-failure: staging cleanup is best effort after the copy; a re-upload after the check gets a clear error; tests | S6 | inline | done | fdee267 |
| T5 | Final review fixes (API, PR #9): staged upload via presigned POST with content-length-range 1 B–20 MB and Content-Type application/pdf (R1-staged-put-uncapped), bucket CORS allows POST; rejection-path staging discard is best effort so the member keeps the real reason (R3/R4-reject-discard); S3 adapter unit tests through an injectable S3Client | S3, S6 | gentle-ai-worker | done | 8f117c3, 947196d |
| T6 | Final review fixes (UI, PR #10): wizard uploads with the POST form fields; PdfFirstPage destroys a loading task cancelled mid-load (R4-preview-destroy-race) | S1, S4 | inline | pending | |
| T2 | Wizard UI at `/mis-partituras` with pdfjs first-page preview, tab entry, director view of skips on the song page, README | S1, S2, S4, S5, S6 | inline | done | 46b03cc |

## Log

- **L1 (user's original request, verbatim):**
  > Para que el trabajo de subir los PDF incialmente ( >40 canciones en el repertorio) quiero habilitar a cada musico de publicar su propio PDF de partitura para cada una de las canciones del repertorio.
  >
  > Se me ocurre como idea irle presentando cancion por cancion, con botones de anterior y siguiente. Tiene 2 opciones, subir un PDF o escoger la opcion de "Saltar porque no lo tengo" y poder continuar con las demas. Como la persona en su perfil ya tiene el instrumento el mismo sistema va a renombrar el PDF indepentientemente del nombre con el que se suba.
  >
  > Debe tener vista previa de la primera pagina
- **L2 — Decisions (user answers):** existing PDF → "Mostrar el actual y permitir reemplazarlo"; skip → "Sí, se guarda por músico y canción"; preview → "Agregar pdfjs-dist". Assumed (reversible): route `/mis-partituras`, tab visible to members with a part.
- **L3 — T1 evidence:** RED (module missing) then GREEN, 9 service tests: per-member progress and start index, idempotent skip, upload named after the profile part, skip cleared on upload, skips per song, no-part and unknown-song rejections leave storage untouched. `pnpm check`: 149 tests pass. Progress uses one S3 listing of `repertorio/` instead of one per song. The skip is cleared when the upload URL is issued, before the PUT; a failed PUT loses the skip (accepted, low impact). The director's "No la tienen" hides skips whose part already has a PDF.
- **L4 — T2 evidence:** `pnpm build` OK; pdfjs-dist 6.5.438 lives in its own lazy chunk plus a worker asset, loaded only by `/mis-partituras`. `pnpm check` passes. Unverified: the wizard, the pdfjs preview (picked file and stored PDF via presigned GET, which relies on the bucket's GET CORS) and the real S3 PUT were not run in a browser; no `sst dev` was running. Risk: item 2 (musicians can now write part PDFs to the bucket, restricted server-side to their own profile part).
- **L5 — Verification:** assess 1a1f3da..HEAD with escalate item 2 → risk high, independentVerifier true, reviewDue false (`under_budget`). Independent gentle-ai-verify: no blockers; S3, S6, S7 met; S2, S5 met server-side; S1, S4 and the UI unverifiable without a browser. `pnpm check` (149 tests) and `pnpm build` exit 0. Should-fix, not applied (pre-existing in the director flow, now wider audience): the presigned PUT has no size cap or content check; a corrupt PDF only becomes a placeholder page in setlists. Members sharing a part name share one file.
- **L6 — Native review:** lineage `review-aa7878d1659870b9`, base 1a1f3da, lenses risk + reliability → approved; authority burned. Non-blocking advisories for later: R1-001 presigned PUT has no size/content cap (wider audience now); R1-002 no S3 versioning, so a musician's replacement of the director's PDF is unrecoverable; R3-skip-cleared-before-put (skip lost on a failed PUT, untested); R3-skippedby-untested (the skippedBy filter lives in a server function, no test).
- **L7 — User request (verbatim):** "Corrige Corrige" → fix R1-001, R1-002, R3-skip-cleared-before-put and R3-skippedby-untested (T3).
- **L8 — T3 evidence (c2f9c5a):** RED: 10 of 14 service tests failed; GREEN: 14 pass. `pnpm check`: 154 tests; `pnpm build` OK. Members upload to `staging/<email>/<songId>.pdf`; `confirmUpload` rejects a missing file, >20 MB ("El PDF pesa más de 20 MB") or a non-`%PDF-` header ("El archivo no es un PDF válido"), discarding it and leaving the stored score and skip unchanged; on success it copies to the part key and only then clears the skip (R1-001, R3-skip-cleared-before-put). `skipsForSong(songId, uploadedParts)` now filters in the service, with a test (R3-skippedby-untested). `sst.config.ts`: Scores versioning on; lifecycle expires `staging/` after 1 day and noncurrent versions after 30 days (R1-002). Unverified: the S3 adapter (range GET, CopyObject) and `sst.config.ts` are outside tsc and tests; they need `sst diff`/deploy and a browser run. The staged PUT itself is still uncapped; an oversized staged object only costs storage until it expires.
- **L9 — T3 verification and follow-up (8ba4f57):** assess 8d45ff3..ec0d335 with escalate item 5 → independentVerifier. gentle-ai-verify found no blockers. R1-001, R3-skip and R3-skippedby are met server-side; R1-002 is partly met. Applied:
  - Should-fix: versioning kept staging bytes about 31 days, so the staging rule now also expires noncurrent versions after 1 day, and the doc wording is fixed.
  - Advisory: promote copies with `CopySourceIfMatch` on the checked ETag, which closes the re-upload race.
  - Advisory: an unknown (NaN) size fails closed, with a new test. Its RED was not observed separately: the test was added together with the fix.
  - Checks: `pnpm check` passes 155 tests and `pnpm build` is OK.
  - Still unverified: `sst diff` or a deploy of versioning and lifecycle (lifecycle has no explicit dependsOn on versioning), the real S3 calls and the browser flow. The S3 adapter has no unit test, because it builds its own S3Client.
  - The verifier's scratch dir `/tmp/v3xdXG` was left outside the project.
- **L10 — Native review of the fixes:** lineage `review-2831d6e471aa2112`, base 984fb8b, lenses risk + resilience + reliability → approved; authority burned. Non-blocking advisories: R1-staged-put-uncapped (the staged PUT is still uncapped, bounded by confirm + 1-day purge; a presigned POST with content-length-range would cap it); R3-promote-delete-failure (if deleting staging fails after the copy, confirm reports an error although the score was replaced and the skip stays; PreconditionFailed retry path untested).
- **L11 — User request (verbatim):** "Corrige y publica stacked PRs" → T4, then publish stacked PRs.
- **L12 — T4 evidence:** RED (2 of 17 failed: staged file not discarded by the service; missing re-upload message) then GREEN. `pnpm check`: 157 tests; `pnpm build` OK. The service now calls `discardStaged` after the copy and the skip delete, ignoring its failure; the adapter maps `PreconditionFailed` to "El archivo cambió mientras lo revisábamos. Probá de nuevo.".
- **L13 — Delivery (user: "publica stacked PRs"):** the local branch `feat/self-service-scores` (through fdee267) was recomposed into two slices on origin/main 1a1f3da:
  - #9 `feat/self-service-scores-api` → main: service, functions, S3 adapter, container, sst.config, tests and this document. It passes `pnpm check` alone.
  - #10 `feat/self-service-scores-ui` → #9: wizard, preview, tab, song page, pdfjs-dist and docs. Its tree is identical to fdee267.
  - The original local branch is kept, unpushed. Merging stays the user's decision.
- **L14 — Native review of the whole stack:** lineage `review-249c7e6d557d154e`, base 1a1f3da → approved. Advisories: R1-staged-put-uncapped; R3-reject-discard-failure-masks-reason and R4-reject-discard-masks-reason (a failed discard on rejection replaces the size/PDF message with a generic error); R4-preview-destroy-race (fast navigation leaks pdfjs loads). CI on #9 and #10 green.
- **L15 — User request (verbatim):** "Corrige todo, dejalo perfecto" → T5 (API, on #9) and T6 (UI, on #10, after merging #9's branch into #10 without force-push). Adds `@aws-sdk/s3-presigned-post` (official AWS SDK package) for the capped upload.
- **L16 — T5 evidence (8f117c3, 947196d):** worker RED: 12 failed (port missing, discard error masked the reason, adapter ignored the injected client); GREEN 28/28 in the two files. `pnpm check`: 168 tests in 18 files; `pnpm build` OK. The staged upload is a presigned POST with `content-length-range` [1, 20971520] and Content-Type `application/pdf`. Bucket CORS allows POST. `@aws-sdk/s3-presigned-post` is 3.1175.0, the same as the other SDK packages. The worker could not commit (worker rule), so the parent committed. Unverified against AWS: the real POST and the CORS change.
