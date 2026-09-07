const { readState, readDraftState, isJobOpen } = require('./_cms');
const { verifyPreview, previewToken, loadPreviewState } = require('./_preview');

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const paragraphHtml = value => escapeHtml(value).split(/\n{2,}/).filter(Boolean).map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('');
const employmentLabel = value => ({ FULL_TIME: 'Full time', PART_TIME: 'Part time', CONTRACTOR: 'Contract', TEMPORARY: 'Temporary', INTERN: 'Internship', VOLUNTEER: 'Volunteer', PER_DIEM: 'Per diem', OTHER: 'Other' })[value] || String(value || '').replaceAll('_', ' ').toLowerCase();
const workplaceLabel = value => ({ ONSITE: 'In person', HYBRID: 'Hybrid', REMOTE: 'Remote' })[value] || 'In person';
const dateLabel = value => {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
};
const canonicalOrigin = () => String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
const listMarkup = (title, items) => items.length ? `<section class="career-detail-section"><h2>${title}</h2><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : '';
const structuredList = (title, items) => items.length ? `<h2>${title}</h2><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';

module.exports = async function handler(req, res) {
  if (process.env.CMS_ONLY_DEPLOYMENT === '1') { res.statusCode = 404; return res.end('Not found'); }
  const slug = String(req.query.slug || '').toLowerCase();
  const preview = verifyPreview(previewToken(req));
  const state = preview ? await loadPreviewState(req, readDraftState) : await readState();
  const job = state.jobs.find(item => isJobOpen(item) && item.slug === slug);
  if (!job) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Position not found | Space</title></head><body><main><h1>Position not found</h1><p>This role is no longer open.</p><p><a href="/careers.html">View current positions</a> &middot; <a href="/">Home</a></p></main></body></html>');
  }

  const publicOrigin = canonicalOrigin();
  const pageUrl = `${publicOrigin}/jobs/${encodeURIComponent(job.slug)}`;
  const applyEmail = job.applyEmail || 'careers@space-tr.com';
  const applyUrl = `mailto:${applyEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`;
  const structuredDescription = `<p>${escapeHtml(job.description)}</p>${structuredList('Responsibilities', job.responsibilities)}${structuredList('Qualifications', job.qualifications)}`;
  const remote = job.workplaceType === 'REMOTE';
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: structuredDescription,
    identifier: { '@type': 'PropertyValue', name: 'Space', value: job.id },
    datePosted: job.datePosted,
    ...(job.validThrough ? { validThrough: job.validThrough } : {}),
    employmentType: job.employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      '@id': `${publicOrigin}/#organization`,
      name: 'SPACE-TR',
      alternateName: 'SPACE',
      sameAs: `${publicOrigin}/`,
      logo: `${publicOrigin}/favicon.png`
    },
    ...(remote ? { jobLocationType: 'TELECOMMUTE' } : { jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.locality,
        addressRegion: job.region,
        addressCountry: job.countryCode || job.country
      }
    } }),
    directApply: true,
    inLanguage: 'en',
    industry: 'Fragrance and beauty distribution',
    url: pageUrl
  };
  const closeFact = job.validThrough ? `<div><dt>Applications close</dt><dd>${escapeHtml(dateLabel(job.validThrough))}</dd></div>` : `<div><dt>Reference</dt><dd>${escapeHtml(job.id)}</dd></div>`;
  const placeFact = remote ? '' : `<div><dt>Location</dt><dd>${escapeHtml(job.location)}</dd></div>`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(job.title)} | Careers at Space</title>
  <link rel="icon" href="/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="description" content="${escapeHtml(job.summary || job.description).slice(0, 160)}">
  <meta name="robots" content="${preview ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large,max-snippet:-1'}">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Space">
  <meta property="og:title" content="${escapeHtml(job.title)} | Careers at Space">
  <meta property="og:description" content="${escapeHtml(job.summary || job.description).slice(0, 160)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${publicOrigin}/assets/brand/campaigns/campaign-hero-static.avif">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Marcellus&amp;family=Roboto:wght@300;400;500&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/pages/home.css?v=career-role-2">
  <link rel="stylesheet" href="/css/pages/careers.css?v=10">
  <link rel="stylesheet" href="/css/pages/career-detail.css?v=2">
  <script type="application/ld+json">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script>
</head>
<body class="career-detail-page">
  <header class="career-header">
    <a class="career-brand" href="/" aria-label="Space home"><img src="/assets/brand/identity/space-logo-transparent.png" alt="Space"></a>
    <nav class="career-detail-nav" aria-label="Career navigation"><a href="/careers.html">Positions</a><a href="/">Home</a></nav>
  </header>
  <main class="career-detail-main">
    <section class="career-detail-hero">
      <div class="career-detail-title"><p class="career-detail-eyebrow">${escapeHtml(job.department)}</p><h1>${escapeHtml(job.title)}</h1></div>
      <dl class="career-detail-meta"><div><dt>Work style</dt><dd>${escapeHtml(workplaceLabel(job.workplaceType))}</dd></div>${placeFact}<div><dt>Employment</dt><dd>${escapeHtml(employmentLabel(job.employmentType))}</dd></div><div><dt>Posted</dt><dd>${escapeHtml(dateLabel(job.datePosted))}</dd></div>${closeFact}</dl>
    </section>
    <section class="career-detail-body" aria-label="${escapeHtml(job.title)} position details">
      <section class="career-detail-section"><h2>The role</h2><div>${paragraphHtml(job.description)}</div></section>
      ${listMarkup('Responsibilities', job.responsibilities)}
      ${listMarkup('Qualifications', job.qualifications)}
      <div class="career-detail-apply"><p>Send your CV and a short introduction to our careers team at ${escapeHtml(applyEmail)}.</p><a href="${escapeHtml(applyUrl)}">Apply by email</a></div>
    </section>
  </main>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', preview ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  if (preview) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res.end(html);
};
