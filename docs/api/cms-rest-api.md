# SPACE CMS REST API

The private CMS exposes a draft-first API for trusted server-side automations. It is hosted with the CMS, not the public website.

Base URL: `https://space-tr-cms.vercel.app`

## Authentication

Set `CMS_API_KEY` only in the `space-tr-cms` Vercel project and the secret manager used by the calling automation.

```http
Authorization: Bearer YOUR_CMS_API_KEY
```

Never put this key in browser JavaScript, a mobile app, a URL, a committed file, or a prompt. Requests are rate-limited to 120 per hour per source IP.

The authenticated machine-readable contract is:

```bash
curl "$CMS_URL/api/v1/openapi" \
  -H "Authorization: Bearer $CMS_API_KEY" \
  --output space-cms-openapi.json
```

## Safe workflow

1. Read the resource and retain its returned `version`.
2. Upload images first and retain the web-ready `url`.
3. Create or update content. Mutations only save the draft.
4. Request a signed preview URL and review the result.
5. Call the publish endpoint only after explicit approval.

For a new article, first update that post with `{"patch":{"published":true}}`; the final publish call then makes it public. Keeping `published:false` allows other approved CMS changes to go live while that article remains a draft.

Include `expectedVersion` in mutations. A `409` means another editor changed the draft; fetch the current resource, reconcile the edits, and retry.

## Content resources

`/api/v1/content` supports:

- `GET` to list resource counts or read one resource.
- `POST` to create one item in `brands`, `jobs`, `team`, `posts`, or `pageImages`.
- `PATCH` to update one collection item, or merge `media` and `settings`.
- `PUT` to replace a complete resource.
- `DELETE` to remove one collection item from the draft.

The valid resource names are `brands`, `jobs`, `team`, `posts`, `media`, `pageImages`, and `settings`.

```bash
curl "$CMS_URL/api/v1/content?resource=team" \
  -H "Authorization: Bearer $CMS_API_KEY"

curl -X PATCH "$CMS_URL/api/v1/content?resource=team&id=TEAM_ID" \
  -H "Authorization: Bearer $CMS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"patch":{"role":"Commercial Director"},"expectedVersion":12}'
```

User accounts, sessions, password recovery, revisions, and audit records are never exposed through this API.

## Article drafts

`GET /api/v1/posts?status=draft&limit=20&includeBody=1` lists articles. `POST /api/v1/posts` creates or idempotently updates a draft. Reusing `sourceId` or `X-Idempotency-Key` updates the same draft instead of creating a duplicate.

```bash
curl -X POST "$CMS_URL/api/v1/posts" \
  -H "Authorization: Bearer $CMS_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: weekly-editorial-2026-37" \
  -d '{
    "title": "Why selective distribution matters",
    "slug": "why-selective-distribution-matters",
    "date": "2026-09-08",
    "language": "en",
    "excerpt": "A concise summary, maximum 300 characters.",
    "seoTitle": "Selective fragrance distribution in Africa",
    "seoDescription": "How disciplined distribution protects fragrance brands.",
    "author": "Space Editorial Team",
    "imageUrl": "https://...",
    "thumbnailUrl": "https://...",
    "body": "Opening paragraph.\n\n## Market context\n\nUse **bold emphasis** and [trusted links](https://example.com)."
  }'
```

Article body formatting is restricted Markdown:

- Separate paragraphs with a blank line.
- `## Heading` and `### Heading` create section headings.
- `**text**` creates bold emphasis.
- `*text*` creates italic emphasis.
- Consecutive lines beginning with `- ` create a list.
- `[label](https://example.com)` creates a safe external link.
- `![Descriptive alt text](https://example.com/image.jpg)` inserts an image between text blocks. Add `*A short caption*` on the next line when needed.

The legacy `/api/v1/blog-drafts` route remains an alias of `/api/v1/posts`.

## Image assets

`POST /api/v1/media` accepts JSON containing `name`, a supported image MIME `type`, and base64 bytes in `data`. The decoded limit is 8 MB. JPG, PNG, WebP, AVIF and GIF are supported. Deployed uploads are stored in Vercel Blob, added to the asset library, and converted to web-ready variants. Use the returned `url` in any image field.

`GET /api/v1/media` lists assets. `DELETE /api/v1/media?id=ASSET_ID` deletes the source, derivatives, library record, and all draft and published content references.

For large batches, use the CMS browser uploader. It supports up to 50 files or a folder and sends files directly to Vercel Blob.

## Preview and publish

```bash
curl -X POST "$CMS_URL/api/v1/preview" \
  -H "Authorization: Bearer $CMS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"path":"/en/posts/article-slug"}'
```

The signed preview URL expires after ten minutes.

```bash
curl -X POST "$CMS_URL/api/v1/publish" \
  -H "Authorization: Bearer $CMS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope":"all","expectedVersion":12}'
```

`scope` accepts `all`, `desktop`, or `mobile`. Publication validates the complete draft and returns `422` when required content is missing.

## Automated editorial flow

The CMS schedules `/api/cron/editorial` every Tuesday and Friday. Vercel authenticates it with `CRON_SECRET`; the server calls OpenAI with `OPENAI_API_KEY`, requests structured output, and stores the result as a draft. It never auto-publishes.

Required CMS variables:

- `CMS_API_KEY` for external REST clients.
- `CMS_PREVIEW_SECRET` shared with the public site.
- `PUBLIC_SITE_URL` for signed previews.
- `OPENAI_API_KEY` for editorial generation and French translation.
- `OPENAI_EDITORIAL_MODEL` and `OPENAI_TRANSLATION_MODEL` to select models.
- `CRON_SECRET` for scheduled generation.
- `BLOB_READ_WRITE_TOKEN` for asset storage.

## Status codes

- `400`: invalid resource or content.
- `401`: missing or invalid bearer key.
- `404`: item or asset not found.
- `409`: optimistic-lock version conflict.
- `413`: image exceeds the API limit.
- `422`: publication validation failed.
- `429`: rate limit reached; respect `Retry-After`.
- `503`: API key, preview secret, or storage is not configured.

All API responses use private, no-store cache headers.
