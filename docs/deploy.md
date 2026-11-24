# Deploy guide

FOB Admin runs on AWS through SST. It needs a Google Cloud OAuth client (member login) and a refresh token of the band's Google account (calendar invitations).

## 1. Google Cloud

1. Create a project at <https://console.cloud.google.com> and enable the **Google Calendar API**. If it stays disabled, publishing still works but no invitation goes out: the activity page shows the director "No se pudieron enviar las invitaciones" with Google's reason. Saving the activity again retries.
2. **OAuth consent screen**: user type *External*. Scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.events`.
   Publish the app (status *In production*). While it stays in *Testing*, refresh tokens expire after 7 days and calendar invitations stop working.
3. **Credentials → Create OAuth client ID → Web application**. Authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (local development)
   - `<PublicUrl>/auth/google/callback` for each deployed stage (see step 3)
4. **Band calendar refresh token**. Signed in as the band's Google account:
   1. Open <https://developers.google.com/oauthplayground>, click the gear icon, check *Use your own OAuth credentials* and paste the client ID and secret.
   2. Add `https://developers.google.com/oauthplayground` to the client's authorized redirect URIs.
   3. Authorize the scope `https://www.googleapis.com/auth/calendar.events`, then *Exchange authorization code for tokens* and copy the **refresh token**.

   Events are created on that account's primary calendar, and attendees receive the invitation by email.

## 2. Secrets

Set them once per stage (`--stage production` for production; omit it for your personal dev stage):

```bash
pnpm sst secret set GoogleClientId "<client id>" --stage production
pnpm sst secret set GoogleClientSecret "<client secret>" --stage production
pnpm sst secret set BandCalendarRefreshToken "<refresh token>" --stage production
pnpm sst secret set SessionSecret "$(openssl rand -base64 32)" --stage production
pnpm sst secret set PublicUrl "https://placeholder.invalid" --stage production
```

`PublicUrl` is the public origin of the app. It is the base of the OAuth `redirect_uri` and of the links inside calendar events. Use `http://localhost:3000` for `sst dev`.

## 3. First deploy

```bash
pnpm sst deploy --stage production
```

1. The output prints `url`. Set it as `PublicUrl` (or your custom domain), then deploy again so the functions pick it up:

   ```bash
   pnpm sst secret set PublicUrl "https://<id>.cloudfront.net" --stage production
   pnpm sst deploy --stage production
   ```

2. Add `<PublicUrl>/auth/google/callback` to the OAuth client's redirect URIs.

## 4. First director

Only registered members can sign in, so the first director is inserted directly into DynamoDB. After that, members are managed from the app (**Miembros**).

```bash
TABLE=$(pnpm -s sst shell --stage production -- node -e 'console.log(JSON.parse(process.env.SST_RESOURCE_Data).name)')
EMAIL="director@gmail.com"   # Google account, lowercase
NAME="Nombre Director"
PART="Saxofón"               # the part chosen when uploading PDFs

aws dynamodb put-item --table-name "$TABLE" --item "{
  \"pk\": {\"S\": \"MEMBER#$EMAIL\"},
  \"sk\": {\"S\": \"MEMBER\"},
  \"gsi1pk\": {\"S\": \"MEMBER\"},
  \"gsi1sk\": {\"S\": \"$NAME\"},
  \"data\": {\"M\": {
    \"email\": {\"S\": \"$EMAIL\"},
    \"name\": {\"S\": \"$NAME\"},
    \"role\": {\"S\": \"director\"},
    \"part\": {\"S\": \"$PART\"},
    \"sectionIds\": {\"L\": []}
  }}
}"
```

If the `sst shell` line doesn't print the table name, copy it from the DynamoDB console instead (its name contains `Data`).

## 5. Repertoire

Create each song in **Repertorio** first. Then upload the part PDFs with whatever file name they have (`El año viejo- TROMPETA.pdf`) and pick the part each one belongs to; when the file name resembles a part, it comes preselected. The part list holds every part assigned to a member plus the parts the song already has, and each part keeps one PDF. The files are stored under `repertorio/<song>/<part>.pdf` in the `Scores` bucket. When a musician's part is missing for a song, their setlist PDF gets a page with the song name instead.

Musicians can also upload their own part from **Mis partes** (`/mis-partituras`). It walks the repertoire song by song with Anterior and Siguiente, shows the first page of the picked or stored PDF, and offers "Subir PDF" (or "Reemplazar PDF" when one exists) and "Saltar porque no lo tengo". The file is stored as the member's own part, whatever its name. The browser uploads it to `staging/<email>/<song id>.pdf` first; the server only replaces `repertorio/<song>/<part>.pdf` after checking it is a PDF (`%PDF-` header) of at most 20 MB, so a rejected file never touches the stored score. The `Scores` bucket keeps versions: a part PDF replaced by mistake can be restored from S3 within 30 days. Staged uploads, confirmed or not, are purged after about 1 day. Skips are saved per member and song, the wizard resumes at the first song with neither a PDF nor a skip, and the director sees "No la tienen" on each song page.

## 6. CI/CD (GitHub Actions)

Two workflows live in `.github/workflows/`:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | every pull request | `pnpm check` (Biome, tsc, Vitest) and `pnpm build` |
| `deploy.yml` | every push to `main` | runs `ci.yml`, then `pnpm sst deploy --stage production` |

Deploys never run in parallel: a newer push waits for the running deploy, and when several pushes queue up only the latest one deploys. The pipeline reuses the secrets already set with `sst secret set` (step 2); GitHub stores no app secret.

GitHub authenticates to AWS through OIDC, with no long-lived keys. One-time setup, in the AWS account that hosts production:

1. **Identity provider**. IAM → Identity providers → Add provider → *OpenID Connect*:
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
2. **Role**. IAM → Roles → Create role → *Web identity*, pick that provider and audience. Name it, for example, `fob-admin-github-deploy`. Replace its trust policy with this one (`<ACCOUNT_ID>` is your account ID):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
             "token.actions.githubusercontent.com:sub": "repo:FabiSax12/fob-admin:environment:production"
           }
         }
       }
     ]
   }
   ```

   The `sub` condition lets only jobs of this repository that run in the `production` environment assume the role. Pull requests cannot, and the branch restriction of step 4 keeps other branches from declaring that environment: it is required, not optional.
3. **Permissions**. SST creates and updates CloudFront, Lambda, DynamoDB, S3, IAM roles, SSM parameters and its own state bucket, so the role needs broad rights. The simplest option is the `AdministratorAccess` managed policy, acceptable in an account used only for this app. To narrow it, follow SST's IAM permissions guide and test with a deploy.
4. **GitHub**. Repository → Settings → Environments → New environment `production`. Under *Deployment branches and tags*, choose *Selected branches* and allow only `main` (required: it is what keeps other branches out of the AWS role). Then add these environment **variables** (not secrets; they are not sensitive):
   - `AWS_DEPLOY_ROLE_ARN`: the role ARN, `arn:aws:iam::<ACCOUNT_ID>:role/fob-admin-github-deploy`
   - `AWS_REGION`: the region production already lives in (the one in your local AWS profile when you ran the first deploy).

To check it, merge a pull request into `main` and follow the run in the **Actions** tab. The deploy job links the app URL when it finishes.

If the region is wrong, SST does not find the existing production state or its secrets, so the deploy fails or targets an empty stage; cancel the run and fix `AWS_REGION`.

## Local development

```bash
pnpm sst dev     # deploys your personal stage and runs the app on http://localhost:3000
```

Set the five secrets on your personal stage first, with `PublicUrl` set to `http://localhost:3000`.
