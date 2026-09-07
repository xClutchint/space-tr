const { readState, isJobOpen } = require('./_cms');
const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);

module.exports = async function handler(req, res) {
  const origin = String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
  const state = await readState();
  const localizedPages = ['', 'about-space.html', 'expertise.html', 'posts.html', 'feelnzuri.html', 'careers.html'];
  const staticPages = ['en', 'fr'].flatMap(language => localizedPages.map(page => ({
    path: `/${language}/${page}`,
    alternates: {
      en: `${origin}/en/${page}`,
      fr: `${origin}/fr/${page}`,
      'x-default': `${origin}/en/${page}`
    }
  }))).concat([{ path: '/privacy-policy.html' }]);
  const urls = staticPages.map(item => ({ loc: `${origin}${item.path}`, lastmod: state.updatedAt, alternates: item.alternates }));
  state.jobs.filter(job => isJobOpen(job)).forEach(job => urls.push({ loc: `${origin}/jobs/${job.slug}`, lastmod: job.updatedAt || state.updatedAt || job.datePosted }));
  state.posts.filter(post => post.published !== false && post.format !== 'linkedin').forEach(post => {
    const language = post.language === 'fr' ? 'fr' : 'en';
    urls.push({ loc: `${origin}/${language}/posts/${post.slug}`, lastmod: post.updatedAt || state.updatedAt || post.date });
  });
  state.team.filter(person => person.active !== false).forEach(person => ['en','fr'].forEach(language => urls.push({
    loc: `${origin}/${language}/team/${person.slug}`,
    lastmod: state.updatedAt,
    alternates: {
      en: `${origin}/en/team/${person.slug}`,
      fr: `${origin}/fr/team/${person.slug}`,
      'x-default': `${origin}/en/team/${person.slug}`
    }
  })));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.map(item => `  <url><loc>${escapeXml(item.loc)}</loc><lastmod>${escapeXml(String(item.lastmod).slice(0, 10))}</lastmod>${item.alternates ? Object.entries(item.alternates).map(([language, href]) => `<xhtml:link rel="alternate" hreflang="${language}" href="${escapeXml(href)}"/>`).join('') : ''}</url>`).join('\n')}\n</urlset>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.end(xml);
};
