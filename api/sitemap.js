const { readState, isJobOpen } = require('./_cms');
const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);

module.exports = async function handler(req, res) {
  const origin = String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
  const state = await readState();
  const localizedPages = ['', 'about-space.html', 'expertise.html', 'posts.html', 'feelnzuri.html', 'space-x-maven.html', 'careers.html'];
  const staticPages = ['en', 'fr'].flatMap(language => localizedPages.map(page => `/${language}/${page}`))
    .concat(['/privacy-policy.html']);
  const urls = staticPages.map(path => ({ loc: `${origin}${path}`, lastmod: state.updatedAt }));
  state.jobs.filter(job => isJobOpen(job)).forEach(job => urls.push({ loc: `${origin}/jobs/${job.slug}`, lastmod: job.updatedAt || state.updatedAt || job.datePosted }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(item => `  <url><loc>${escapeXml(item.loc)}</loc><lastmod>${escapeXml(String(item.lastmod).slice(0, 10))}</lastmod></url>`).join('\n')}\n</urlset>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.end(xml);
};
