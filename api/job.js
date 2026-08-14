const { readState } = require('./_cms');

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const paragraphHtml = value => escapeHtml(value).split(/\n{2,}/).filter(Boolean).map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('');
const employmentLabel = value => ({ FULL_TIME: 'Full time', PART_TIME: 'Part time', CONTRACTOR: 'Contract', TEMPORARY: 'Temporary', INTERN: 'Internship', VOLUNTEER: 'Volunteer', PER_DIEM: 'Per diem', OTHER: 'Other' })[value] || String(value || '').replaceAll('_', ' ').toLowerCase();

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || '').toLowerCase();
  const state = await readState();
  const job = state.jobs.find(item => item.active && item.slug === slug);
  if (!job) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Position not found | Space</title></head><body><p>That position is no longer available.</p><p><a href="/careers.html">View current positions</a></p></body></html>');
  }
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const origin = `${protocol}://${req.headers.host}`;
  const pageUrl = `${origin}/jobs/${encodeURIComponent(job.slug)}`;
  const applyUrl = `mailto:${encodeURIComponent(job.applyEmail || 'careers@space-tr.com')}?subject=${encodeURIComponent(`Application — ${job.title}`)}`;
  const structured = {
    '@context': 'https://schema.org', '@type': 'JobPosting', title: job.title,
    description: `<p>${escapeHtml(job.description)}</p>${job.responsibilities.length ? `<h2>Responsibilities</h2><ul>${job.responsibilities.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}${job.qualifications.length ? `<h2>Qualifications</h2><ul>${job.qualifications.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}`,
    identifier: { '@type': 'PropertyValue', name: 'Space', value: job.id },
    datePosted: job.datePosted, validThrough: job.validThrough, employmentType: job.employmentType,
    hiringOrganization: { '@type': 'Organization', name: 'Space', sameAs: origin, logo: `${origin}/brand%20kit/identity/Space%20Logo-20-transparent.png` },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.locality, addressRegion: job.region, addressCountry: job.countryCode } },
    directApply: true, url: pageUrl
  };
  const list = (title, items) => items.length ? `<section><h2>${title}</h2><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(job.title)} | Careers at Space</title><meta name="description" content="${escapeHtml(job.summary || job.description).slice(0, 160)}"><link rel="canonical" href="${pageUrl}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet"><script type="application/ld+json">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script><style>
  *{box-sizing:border-box}html{background:#f3efe7;color:#171714;font-family:Roboto,Arial,sans-serif}body{margin:0}a{color:inherit}.job-header{height:86px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(24px,6vw,92px);border-bottom:1px solid #c9c1b3}.job-header img{width:104px;height:auto}.job-header a:last-child{text-transform:uppercase;letter-spacing:.12em;font-size:12px;text-underline-offset:5px}.job-hero{padding:clamp(70px,10vw,150px) clamp(24px,10vw,160px) 70px;background:#141611;color:#f6f2e9}.job-hero p{color:#b8a883;text-transform:uppercase;letter-spacing:.18em;font-size:11px}.job-hero h1{font:400 clamp(42px,7vw,94px)/.95 Marcellus,serif;max-width:980px;margin:22px 0 35px}.job-facts{display:flex;flex-wrap:wrap;gap:12px 34px;color:#d9d3c7;font-size:14px}.job-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:clamp(50px,8vw,130px);max-width:1200px;margin:auto;padding:clamp(60px,8vw,120px) 24px}.job-copy{font-size:17px;line-height:1.75;max-width:720px}.job-copy h2{font:400 30px Marcellus,serif;margin:55px 0 20px}.job-copy ul{padding-left:20px}.job-copy li{margin:11px 0}.job-aside{position:sticky;top:24px;align-self:start;border-top:1px solid #9a907f;padding-top:22px}.job-aside p{line-height:1.6;color:#5e5a52}.job-apply{display:block;background:#171714;color:#fff;text-align:center;text-decoration:none;padding:17px;margin-top:24px;text-transform:uppercase;letter-spacing:.13em;font-size:11px}@media(max-width:760px){.job-layout{grid-template-columns:1fr}.job-aside{position:static;order:-1}.job-header{height:72px}.job-hero{padding-top:80px}}
  </style></head><body><header class="job-header"><a href="/"><img src="/brand%20kit/identity/Space%20Logo-20-transparent.png" alt="Space"></a><a href="/careers.html">All positions</a></header><main><section class="job-hero"><p>${escapeHtml(job.department)}</p><h1>${escapeHtml(job.title)}</h1><div class="job-facts"><span>${escapeHtml(job.location)}</span><span>${escapeHtml(employmentLabel(job.employmentType))}</span><span>Posted ${escapeHtml(job.datePosted)}</span></div></section><div class="job-layout"><article class="job-copy">${paragraphHtml(job.description)}${list('What you will do', job.responsibilities)}${list('What you bring', job.qualifications)}</article><aside class="job-aside"><strong>Interested in this role?</strong><p>Send your CV and a short introduction to our careers team.</p><a class="job-apply" href="${escapeHtml(applyUrl)}">Apply by email</a></aside></div></main></body></html>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  return res.end(html);
};
