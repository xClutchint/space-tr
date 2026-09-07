# CMS authentication

The production editor is available at `https://space-tr-cms.vercel.app/cms/`.
It is a separate Vercel project and is not shipped in the public `space-tr`
deployment.

## Owner access

- Email: `admin@space-tr.com`
- The current password is kept only in the ignored local file
  `.env.cms-login.local` on the maintainer's machine and as a sensitive Vercel
  environment variable.
- To rotate access, generate a strong password, replace
  `CMS_OWNER_PASSWORD` in the CMS project's Production and Preview
  environments, and deliberately migrate the stored password hash. Changing
  only the environment variable does not overwrite an existing user's hash.

Never commit the local credential file, paste the password into documentation,
or add CMS authentication variables to the public Vercel project.

## Security model

The application stores an scrypt password hash, not the password. Successful
login creates a signed, expiring session in an `HttpOnly`, `Secure`,
`SameSite=Lax` cookie. The signed session is safe across Vercel serverless
instances and is invalidated if the user's password changes or the account is
disabled. Mutating requests also require a session-bound CSRF token and
same-origin checks. Login and recovery endpoints are rate limited. Content and
authentication records in Blob storage are encrypted at rest with the CMS
session secret.

The draft/published content document is stored in its own encrypted Blob
object. It is deliberately isolated from login rate limits, sessions, audit
events and asset records so a request running on an older serverless instance
cannot overwrite a newer content version while updating unrelated metadata.

Vercel Authentication protects preview and generated deployment URLs. On the
Hobby plan it does not protect the production custom domain, so the
application login is the required production boundary. The CMS also sends
`noindex` headers and disallows crawlers, but crawler directives are not an
authentication mechanism.

## Password recovery

Recovery remains unavailable until `RESEND_API_KEY` and `CMS_EMAIL_FROM` are
configured on the CMS project. The endpoint intentionally returns the same
generic response whether or not an account exists. Until mail is configured,
rotate the owner credential administratively and migrate the stored hash.

## Verification

Run `node tools/qa/verify-cms-auth-live.js`. The check verifies an anonymous
request is rejected, logs in with the ignored local credential, confirms the
owner role and content version, checks the cookie flags, and logs out.
