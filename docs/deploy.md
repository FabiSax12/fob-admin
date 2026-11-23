# Deploy guide

FOB Admin runs on AWS through SST. It needs a Google Cloud OAuth client (member login) and a refresh token of the band's Google account (calendar invitations).

## 1. Google Cloud

1. Create a project at <https://console.cloud.google.com> and enable the **Google Calendar API**.
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

## Local development

```bash
pnpm sst dev     # deploys your personal stage and runs the app on http://localhost:3000
```

Set the five secrets on your personal stage first, with `PublicUrl` set to `http://localhost:3000`.
