const { readState } = require('./_cms');
const escapeXml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);

module.exports = async function handler(req, res) {
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const origin = `${protocol}://${req.headers.host}`;
  const state = await readState();
  const staticPages = ['/', '/about-space.html', '/expertise.html', '/careers.html', '/posts.html', '/feelnzuri.html', '/space-x-maven.html', '/privacy-policy.html'];
  const urls = staticPages.map(path => ({ loc: `${origin}${path}`, lastmod: state.updatedAt }));
  state.jobs.filter(job => job.active).forEach(job => urls.push({ loc: `${origin}/jobs/${job.slug}`, lastmod: state.updatedAt }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(item => `  <url><loc>${escapeXml(item.loc)}</loc><lastmod>${escapeXml(String(item.lastmod).slice(0, 10))}</lastmod></url>`).join('\n')}\n</urlset>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.end(xml);
};
