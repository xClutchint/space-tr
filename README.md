# Space corporate website

A dependency-free static corporate site with a small Node development server.

## Project map

| Location | Purpose |
| --- | --- |
| `*.html` | Public pages kept at the root so existing URLs remain stable |
| `css/` | Shared and page-specific stylesheets |
| `js/` | Shared and page-specific browser code |
| `assets/` | Campaign media, optimized derivatives, manifests and curation data |
| `brand kit/` | Approved brand material grouped into `identity/`, `brands/`, `campaign/`, `regions/`, `team/` and `ventures/` |
| `cms/` | Private content-studio page, styles and browser code |
| `data/` | Structured content generated or consumed by the site |
| `tools/` | Media optimization, manifest generation and LinkedIn synchronization |
| `docs/` | Developer setup notes |
| `.github/workflows/` | Scheduled LinkedIn content synchronization |

The public page files stay at the repository root so their existing URLs remain stable. The
space in `brand kit/` is retained for URL compatibility; the contents are grouped by purpose.

## Common commands

```powershell
npm start              # Generate content and serve http://localhost:3000
npm run build          # Create the production bundle in dist/
npm run optimize:media # Refresh optimized display images and thumbnails
npm run sync:linkedin  # Fetch approved LinkedIn posts, when credentials are configured
npm test               # Run rotation and real mobile-viewport regression checks
```

## Source and runtime boundaries

- `assets/<brand>/` contains the original campaign library. Keep it as source material; it is
  excluded from production deployment.
- `assets/_derivatives/` contains web-ready media generated from that library.
- `assets/_catalog/`, `assets/media-manifest.js` and `assets/media-curation.js` are generated or
  curated runtime indexes. The site reads these instead of scanning source folders in-browser.
- Root HTML filenames are deliberately stable public URLs. Page code belongs in the matching
  `css/` and `js/` files rather than being added inline.
- Temporary screenshots and browser profiles belong in `.edge-preview/`; root-level `qa-*` and
  `tmp-*` artifacts are ignored and may be safely regenerated.

`npm run test:responsive` starts a real mobile device emulation against the running local server
and fails when a public page creates horizontal overflow. Start the site first with `npm start`.

The dedicated hero approval catalogue is available at
`http://localhost:3000/hero-assets.html`. It mirrors the exact homepage hero
pool and saves local approvals directly into `assets/media-curation.js`.

The broader local media review interface is available at
`http://localhost:3000/tools/media-library/index.html`.
LinkedIn setup is documented in [`docs/linkedin-posts.md`](docs/linkedin-posts.md).

## Environment variables

Copy `.env.example` into your preferred local environment setup. The contact API supports:

- `RESEND_API_KEY`
- `CONTACT_TO`
- `CONTACT_FROM` (optional)

LinkedIn synchronization uses:

- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_AUTHOR_URN`
- `LINKEDIN_API_VERSION` (optional)
- `LINKEDIN_POST_COUNT` (optional)

Before production, place the contact endpoint behind a trusted proxy/CDN and add Turnstile or
an equivalent challenge in addition to its existing validation, honeypot and rate limit.
