# LinkedIn posts integration

The website does not automate a browser or scrape LinkedIn pages. It uses LinkedIn's official Posts API, stores the approved post data in `data/linkedin-posts.json`, and generates normal HTML in `posts.html`. The cached page remains fast and crawlable even when LinkedIn is unavailable.

## Important permission requirement

Reading posts by a member requires LinkedIn's `r_member_social` permission. Reading posts by an organisation requires `r_organization_social`. LinkedIn currently provides these permissions through the vetted Community Management API product, so creating a basic developer application alone may not grant access.

Official references:

- [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
- [Community Management API access](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview)
- [OAuth authorization-code flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)

## Connect an account

1. Create or open an application in the [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
2. Request the Community Management API product and the required read permission for the account type.
3. Complete LinkedIn's three-legged OAuth flow for the account and obtain an access token.
4. Obtain the author URN, for example `urn:li:person:...` for a member or `urn:li:organization:...` for a company page.
5. Copy `.env.example` to `.env` and set the token and author URN. `.env` is already ignored by Git.

PowerShell example for a one-off local test:

```powershell
$env:LINKEDIN_ACCESS_TOKEN='your-token'
$env:LINKEDIN_AUTHOR_URN='urn:li:person:your-id'
npm run sync:linkedin
npm run generate:posts
```

Then open `http://localhost:3000/posts.html` after running `npm start`.

## Automated publishing

The workflow at `.github/workflows/linkedin-posts.yml` runs every Monday and Thursday and can also be started manually. Add these GitHub Actions repository secrets:

- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_AUTHOR_URN`

Optional repository variables:

- `LINKEDIN_API_VERSION`, default `202604`
- `LINKEDIN_POST_COUNT`, default `50`, maximum `100`

When new posts are found, the workflow updates the cache and generated HTML, commits both files, and pushes the change. The normal Vercel Git integration can then deploy the refreshed page.

## Curating posts

The cache is intentionally editable. Set `"hidden": true` on a cached post to keep it off the website. You may add an `imageUrl` or a shorter `title` to a post. The next sync preserves those three curated fields for matching post IDs.

Do not store access tokens in the cache, the HTML, source control, or client-side JavaScript.
