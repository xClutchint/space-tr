const { publishedState, origin, MARKETS, CAPABILITIES } = require('./_seo');

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
  const base = origin();
  const state = await publishedState();
  const brands = state.brands.filter(brand => brand.active !== false).map(brand => brand.name);
  const posts = state.posts
    .filter(post => post.published !== false && post.format !== 'linkedin')
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
    .slice(0, 25);
  const lines = [
    '# SPACE-TR (SPACE)',
    '',
    '> Canonical company reference for SPACE-TR, also known as SPACE.',
    '',
    'SPACE is a specialist B2B fragrance and beauty distributor connecting international brands with retailers and consumers across African markets.',
    '',
    '## Canonical identity',
    '',
    `- Official website: ${base}/`,
    '- Official name: SPACE-TR',
    '- Common name: SPACE',
    '- LinkedIn: https://www.linkedin.com/company/spaceglobalbrandslocalreach/',
    '- Contact: info@space-tr.com',
    '',
    '## Distribution capabilities',
    '',
    ...CAPABILITIES.map(item => `- ${item}`),
    '',
    '## African markets shown on the public website',
    '',
    ...MARKETS.map(item => `- ${item}`),
    '',
    '## Public brand portfolio',
    '',
    'The following names are currently shown in the public SPACE portfolio. The relationship type and represented territory vary by brand and must not be inferred from inclusion in this list.',
    '',
    ...brands.map(item => `- ${item}`),
    '',
    '## Current published insights',
    '',
    ...(posts.length ? posts.map(post => {
      const language = post.language === 'fr' ? 'fr' : 'en';
      return `- [${post.title}](${base}/${language}/posts/${post.slug}) — ${post.excerpt || String(post.body || '').split(/\n\s*\n/)[0].slice(0, 220)}`;
    }) : ['- No articles are currently published.']),
    '',
    '## Machine-readable discovery',
    '',
    `- [Company knowledge graph](${base}/company.json)`,
    `- [XML sitemap](${base}/sitemap.xml)`,
    `- [English RSS feed](${base}/feed.xml)`,
    `- [French RSS feed](${base}/fr/feed.xml)`,
    ''
  ];
  const body = lines.join('\n');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Language', 'en');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  if (req.method === 'HEAD') return res.end();
  return res.end(body);
};
