const { publishedState, origin, absolute, escapeXml } = require('./_seo');

const safeDate = value => {
  const date = new Date(value || 0);
  return Number.isNaN(date.valueOf()) ? new Date(0).toUTCString() : date.toUTCString();
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method not allowed');
  }
  if (process.env.CMS_ONLY_DEPLOYMENT === '1') {
    res.statusCode = 404;
    return res.end('Not found');
  }
  const language = req.query?.language === 'fr' ? 'fr' : 'en';
  const base = origin();
  const state = await publishedState();
  const posts = state.posts
    .filter(post => post.language === language && post.format !== 'linkedin')
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
    .slice(0, 50);
  const feedUrl = language === 'fr' ? `${base}/fr/feed.xml` : `${base}/feed.xml`;
  const journalUrl = `${base}/${language}/posts.html`;
  const title = language === 'fr' ? 'Publications SPACE' : 'SPACE Insights';
  const description = language === 'fr'
    ? 'Analyses et actualites de SPACE sur la parfumerie, la beaute et la distribution en Afrique.'
    : 'Insights from SPACE on fragrance, beauty and distribution across African markets.';
  const latest = posts[0]?.updatedAt || posts[0]?.date || state.updatedAt;
  const items = posts.map(post => {
    const url = `${base}/${language}/posts/${encodeURIComponent(post.slug)}`;
    const image = absolute(post.thumbnailUrl || post.imageUrl, base);
    const summary = post.excerpt || String(post.body || '').split(/\n\s*\n/)[0].slice(0, 300);
    return `  <item>\n    <title>${escapeXml(post.title)}</title>\n    <link>${escapeXml(url)}</link>\n    <guid isPermaLink="true">${escapeXml(url)}</guid>\n    <pubDate>${escapeXml(safeDate(post.date))}</pubDate>\n    <dc:creator>${escapeXml(post.author || 'SPACE Editorial Team')}</dc:creator>\n    <description>${escapeXml(summary)}</description>${image ? `\n    <media:content url="${escapeXml(image)}" medium="image"/>` : ''}\n  </item>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">\n<channel>\n  <title>${escapeXml(title)}</title>\n  <link>${escapeXml(journalUrl)}</link>\n  <description>${escapeXml(description)}</description>\n  <language>${language}</language>\n  <lastBuildDate>${escapeXml(safeDate(latest))}</lastBuildDate>\n  <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>\n${items}\n</channel>\n</rss>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('X-Robots-Tag', 'noindex, follow');
  if (req.method === 'HEAD') return res.end();
  return res.end(xml);
};
