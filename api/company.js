const { publishedState, companyGraph } = require('./_seo');

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
  const payload = JSON.stringify(companyGraph(await publishedState())).replace(/</g, '\\u003c');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/ld+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('Content-Language', 'en');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'HEAD') return res.end();
  return res.end(payload);
};
