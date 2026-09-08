# Space corporate website

A static-first, bilingual corporate website with server-rendered careers, articles, team profiles
and a private content studio.

## Project map

| Location | Purpose |
| --- | --- |
| Root `*.html` | Canonical English authoring entry points; intentionally kept at the web root |
| `en/`, `fr/` | Indexable language routes with reciprocal `hreflang` |
| `css/pages/`, `js/pages/` | Styles and behavior owned by one public page family |
| `css/shared/`, `js/shared/` | Presentation and behavior reused across page families |
| `assets/brand/` | Identity, people and portfolio assets |
| `assets/editorial/` | Editorial imagery grouped by subject and market |
| `assets/media/source/` | Private raw campaign library; ignored by Git and deployment |
| `assets/media/generated/` | Generated web derivatives and authoring catalogues |
| `assets/media/runtime/` | Minimal browser catalogues used by the live site |
| `cms/assets/` | Private desktop content-studio styles and scripts |
| `api/admin/`, `api/v1/` | CMS operations and secured ingestion endpoints |
| `data/` | Structured seed and generated content |
| `tools/build/`, `tools/media/`, `tools/qa/`, `tools/preview/` | Build, media, verification and preview utilities |
| `docs/architecture/` | Repository and routing contracts |

Root marketing URLs redirect to their `/en/` equivalents in production. Root HTML remains the
authoring source; `npm run generate:locales` refreshes `/en/` and `/fr/` pages.

See [`docs/architecture/repository-layout.md`](docs/architecture/repository-layout.md) before
moving route files or generated media.

## Commands

```powershell
npm start                   # Serve http://localhost:3000
npm run build               # Create the Vercel bundle in dist/
npm run generate:media      # Rebuild media catalogues
npm run generate:hero-mobile
npm run generate:locales
npm run optimize:media
npm test
```

## Content studio

Open `http://localhost:3000/cms/` after `npm start`. The development-only owner is
`space-admin@localhost.test` with password `Space-Local-2026`. Override both values for any shared
environment.

The studio is deliberately desktop-only. That is a presentation restriction, not a security
boundary: accounts, opaque HTTP-only sessions, role checks, same-origin enforcement and CSRF
validation are all enforced on the server. It provides:

- separate desktop and mobile hero catalogues, selections and 5-15 second timing;
- exact-count brand selection, custom logos/banners and drag ordering;
- a drag-ordered lower carousel capped at 20 assets;
- structured careers with indexable `JobPosting` pages;
- bilingual team management with individual `Person` profile pages;
- draft/published blog management with a paginated archive;
- users and roles, OTP recovery, revisions, audit events, backup export and health monitoring.

Blank lines create paragraphs. Career responsibility and qualification fields use one line per
formatted bullet. Imported articles always remain drafts until a CMS user publishes them.

Local state is stored in an ignored JSON database beside `data/cms-content.local.json`; local
uploads use `assets/media/cms/uploads/`. Neither store touches production data. The local server
binds to `127.0.0.1`; set `SPACE_DEV_HOST=0.0.0.0` only for explicit device testing.

## Production configuration

Copy `.env.example` and configure:

- `POSTGRES_URL` or `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `CMS_OWNER_EMAIL`
- `CMS_OWNER_PASSWORD`
- `CMS_SESSION_SECRET`
- `CMS_CSRF_SECRET`
- `CMS_OTP_SECRET`
- `RESEND_API_KEY`
- `CMS_EMAIL_FROM` using a verified sending domain
- `CMS_API_KEY`
- `PUBLIC_SITE_URL`
- `PREVIEW_SITE_URL` set to the public website origin
- `OPENAI_API_KEY` for server-side French translation and twice-weekly editorial drafts

On the public project, set `CMS_PREVIEW_SOURCE_URL` to the private CMS origin
and use the same `CMS_PREVIEW_SECRET` on both projects. This lets published
content and signed draft previews flow directly to the live site without a new
deployment for every CMS publish.

Generate the three CMS secrets independently, for example with `openssl rand -base64 48`. Use a
unique 20+ character owner password in production. `GOOGLE_SERVICE_ACCOUNT_JSON` is optional and
is used only for immediate Google Indexing API notifications when jobs change.

## CMS REST API

The private CMS exposes a machine-authenticated, draft-first content API:

1. `GET|POST|PATCH|PUT|DELETE /api/v1/content` manages every non-account CMS resource.
2. `GET|POST /api/v1/posts` lists posts or creates an idempotent post draft.
3. `GET|POST|DELETE /api/v1/media` manages optimised image assets.
4. `POST /api/v1/preview` creates a short-lived signed draft preview.
5. `POST /api/v1/publish` explicitly publishes an approved draft.
6. `GET /api/v1/openapi` returns the complete authenticated OpenAPI document.

All require `Authorization: Bearer <CMS_API_KEY>`. The key is never sent to the public site or CMS browser code. Every content mutation remains a draft until the separate publish endpoint is called. See [the REST API guide](docs/api/cms-rest-api.md) or the API guide inside the CMS for exact schemas, examples and the automated editorial flow.

## Operations

`GET /api/health` is a non-sensitive datastore check. Owner backup downloads omit password
hashes, session tokens, OTP records and reset tickets. For production, enable automated PostgreSQL
point-in-time recovery, adopt a Vercel Blob retention policy, rotate credentials, monitor health
and function errors, and periodically test a restore into a separate database.

The contact endpoint uses `RESEND_API_KEY`, `CONTACT_TO` and optional `CONTACT_FROM`. Place it
behind a trusted proxy/CDN and add Turnstile or an equivalent challenge before a high-traffic
launch.
