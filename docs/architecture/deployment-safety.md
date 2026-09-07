# Production-safe Vercel layout

Use two Vercel projects connected to the same repository. The CMS publishes
directly to the live public project.

| Project | Vercel config | Purpose |
| --- | --- | --- |
| `space-tr` | `vercel.json` | Live public website at `www.space-tr.com`. |
| `space-tr-cms` | `tools/build/vercel.cms.json` | Protected editor. Its build contains no public HTML pages. |

The CMS and public project share `CMS_PREVIEW_SECRET`. `PREVIEW_SITE_URL` on
the CMS points to `https://www.space-tr.com`, while `CMS_PREVIEW_SOURCE_URL` on
the public project points back to the CMS. This short-lived, signed
server-to-server bridge renders draft previews and supplies published content
without copying the CMS storage credential into the public project. Browser
requests cannot use the published content endpoint without a valid
server-generated signature.

Keep Vercel Authentication enabled wherever the current plan permits it. The
Hobby project currently rejects Vercel Authentication for the production alias,
so the in-application CMS login is the production access-control layer; every
admin/data mutation route enforces it. The CMS also sends `noindex` headers and
ships a disallow-all `robots.txt`, but those crawler directives are not treated
as access control.

CMS, editorial-cron and ingestion route entrypoints live outside `/api` in the
repository. `npm run build:cms` generates ignored Vercel wrappers for the CMS
deployment; `npm run build:site` removes them. This is why the public project
contains no CMS, cron or ingestion functions.

For a public deployment, run `npm run build:site` before `vercel build` so no
locally generated CMS wrappers are present. Build CMS deployments locally with
the CMS Vercel config, run `npm run prepare:cms-deploy` to retain only its six
private functions, then deploy the prebuilt output. Always pass the intended
project explicitly; never rely on the repository's default link, which points
to `space-tr`.

Publishing is atomic at the content-document level. `PUBLIC_SITE_URL` and
`PREVIEW_SITE_URL` point to `https://www.space-tr.com`, and
`CMS_PREVIEW_SOURCE_URL` on the public project points to the CMS. Keep
`SITE_DEPLOY_HOOK_URL` unset while the deployed production code differs from
the connected Git branch. Publishing content then becomes visible through the
signed content bridge without creating another deployment.

Analytics and Speed Insights are intentionally disabled by default. Set the
matching build environment flag only after confirming the Vercel plan and any
cost for the target project.
