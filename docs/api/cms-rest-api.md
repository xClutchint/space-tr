# SPACE CMS REST API

The CMS exposes a private, draft-first API for trusted automations. It is hosted with the CMS, not the public website.

Base URL: `https://space-tr-cms.vercel.app`

## Authentication

Set `CMS_API_KEY` only in the `space-tr-cms` Vercel project. Send it on every request:

```http
Authorization: Bearer YOUR_CMS_API_KEY
```

Never put this key in public JavaScript, the public Vercel project, a prompt, a URL, or a committed file. Use an environment variable in the automation that calls the API. Requests are rate-limited to 120 per hour per source IP.

On this workstation the generated credential is stored in the ignored `.env.cms-api.local` file. A PowerShell client can load it without printing it:

```powershell
$line = Get-Content .env.cms-api.local -Raw
$key = $line.Substring($line.IndexOf('=') + 1)
$headers = @{ Authorization = "Bearer $key" }
Invoke-RestMethod 'https://space-tr-cms.vercel.app/api/v1/content' -Headers $headers
```

## Endpoints

### Inspect draft content

```bash
curl "https://space-tr-cms.vercel.app/api/v1/content" \
  -H "Authorization: Bearer $CMS_API_KEY"
```

Add `?resource=brands`, `jobs`, `team`, `posts`, `media`, `pageImages`, or `settings` to retrieve one draft resource. User accounts, sessions, revisions, recovery records, and audit data are never returned.

### List posts

```bash
curl "https://space-tr-cms.vercel.app/api/v1/posts?status=draft&limit=20" \
  -H "Authorization: Bearer $CMS_API_KEY"
```

The default response omits the long article body. Add `includeBody=1` when the caller actually needs it. `status` accepts `draft`, `published`, or `all`; `limit` accepts 1–100.

### Create or update a post draft

```bash
curl -X POST "https://space-tr-cms.vercel.app/api/v1/posts" \
  -H "Authorization: Bearer $CMS_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: editorial-2026-09-08-africa-fragrance" \
  --data '{
    "title": "Fragrance retail momentum across African markets",
    "excerpt": "A concise editorial summary.",
    "body": "The complete article body, with blank lines between paragraphs...",
    "language": "en",
    "imageUrl": "https://...public.blob.vercel-storage.com/...webp",
    "date": "2026-09-08"
  }'
```

The API always writes a draft. It cannot publish. Reusing `sourceId` or `X-Idempotency-Key` updates the same draft, making retries safe. A CMS editor reviews and publishes from the top-right Publish control.

The legacy `/api/v1/blog-drafts` route remains an alias of `/api/v1/posts`.

### Upload a blog image

`POST /api/v1/media` accepts JSON containing `name`, a supported image MIME `type`, and raw base64 bytes in `data`. The decoded file limit is 8 MB. Supported formats are JPG, PNG, WebP, AVIF, and GIF. The response contains the stored `url`; pass that URL as `imageUrl` when creating the draft.

For high-volume general asset ingestion, use the CMS browser uploader. It uploads directly to Vercel Blob and processes in parallel without routing large files through this JSON endpoint.

### OpenAPI document

```bash
curl "https://space-tr-cms.vercel.app/api/v1/openapi" \
  -H "Authorization: Bearer $CMS_API_KEY" \
  --output space-cms-openapi.json
```

The OpenAPI document is itself authenticated so the private CMS surface is not advertised to crawlers.

## Automated editorial flow

The CMS already schedules `/api/cron/editorial` at 09:00 UTC every Tuesday and Friday. Vercel authenticates the cron with `CRON_SECRET`; the server calls the OpenAI Responses API with `OPENAI_API_KEY`, requests a strict structured result, and stores the result as a draft. It never auto-publishes.

Required CMS environment variables:

- `CMS_API_KEY` for external REST clients.
- `OPENAI_API_KEY` for the internal editorial generator and French translation.
- `OPENAI_EDITORIAL_MODEL` and `OPENAI_TRANSLATION_MODEL` to choose the models.
- `CRON_SECRET` for the scheduled endpoint.
- `BLOB_READ_WRITE_TOKEN` for media storage.

A separate automation may use the same review-safe path: generate an article, optionally call `/api/v1/media`, then call `/api/v1/posts` with a stable idempotency key. Keep all AI and CMS credentials server-side.

## Error behavior

- `400`: invalid resource or content.
- `401`: missing or invalid bearer key.
- `405`: unsupported HTTP method.
- `413`: image exceeds the API limit.
- `429`: rate limit reached; respect `Retry-After`.
- `503`: the API key or storage is not configured.

Responses use JSON and CMS API responses are served with private, no-store headers.
