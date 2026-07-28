# Space corporate website

A dependency-free, responsive corporate website foundation based on the supplied Space brand guidelines.

## Run locally

```bash
npm start
```

Open `http://localhost:3000`.

## Contact form

The server includes validation, a honeypot and an IP limit of five submissions per hour. To deliver enquiries, configure:

- `RESEND_API_KEY`
- `CONTACT_TO`
- `CONTACT_FROM` (optional)

Before production, place the site behind a trusted proxy/CDN and add Turnstile or an equivalent challenge in addition to the existing controls.
