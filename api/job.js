const { readState, isJobOpen } = require('./_cms');

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const paragraphHtml = value => escapeHtml(value).split(/\n{2,}/).filter(Boolean).map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('');
const employmentLabel = value => ({ FULL_TIME: 'Full time', PART_TIME: 'Part time', CONTRACTOR: 'Contract', TEMPORARY: 'Temporary', INTERN: 'Internship', VOLUNTEER: 'Volunteer', PER_DIEM: 'Per diem', OTHER: 'Other' })[value] || String(value || '').replaceAll('_', ' ').toLowerCase();
const dateLabel = value => {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
};
const canonicalOrigin = () => String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
const listMarkup = (title, items) => items.length ? `<section class="career-detail-section"><h2>${title}</h2><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : '';
const structuredList = (title, items) => items.length ? `<h2>${title}</h2><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || '').toLowerCase();
  const state = await readState();
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
      name: 'Space',
      sameAs: `${publicOrigin}/`,
      logo: `${publicOrigin}/brand%20kit/identity/Space%20Logo-07.jpg`
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.locality,
        addressRegion: job.region,
        addressCountry: job.countryCode
      }
    },
    directApply: true,
    url: pageUrl
  };
  const closeFact = job.validThrough ? `<div><dt>Applications close</dt><dd>${escapeHtml(dateLabel(job.validThrough))}</dd></div>` : `<div><dt>Reference</dt><dd>${escapeHtml(job.id)}</dd></div>`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(job.title)} | Careers at Space</title>
  <meta name="description" content="${escapeHtml(job.summary || job.description).slice(0, 160)}">
  <link rel="canonical" href="${pageUrl}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Marcellus&amp;family=Roboto:wght@300;400;500&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/main.css?v=career-role-2">
  <link rel="stylesheet" href="/css/careers.css?v=10">
  <link rel="stylesheet" href="/css/career-detail.css?v=2">
  <script type="application/ld+json">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script>
</head>
<body class="career-detail-page">
  <header class="career-header">
    <a class="career-brand" href="/" aria-label="Space home"><img src="/brand%20kit/identity/Space%20Logo-20-transparent.png" alt="Space"></a>
    <nav class="career-detail-nav" aria-label="Career navigation"><a href="/careers.html">Positions</a><a href="/">Home</a></nav>
  </header>
  <main class="career-detail-main">
    <section class="career-detail-hero">
      <div class="career-detail-title"><p class="career-detail-eyebrow">${escapeHtml(job.department)}</p><h1>${escapeHtml(job.title)}</h1></div>
      <dl class="career-detail-meta"><div><dt>Location</dt><dd>${escapeHtml(job.location)}</dd></div><div><dt>Employment</dt><dd>${escapeHtml(employmentLabel(job.employmentType))}</dd></div><div><dt>Posted</dt><dd>${escapeHtml(dateLabel(job.datePosted))}</dd></div>${closeFact}</dl>
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
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  return res.end(html);
};
