const assert = require('node:assert/strict');

const origin = String(process.env.SPACE_SMOKE_ORIGIN || 'https://www.space-tr.com').replace(/\/+$/, '');

async function get(path, options = {}) {
  const response = await fetch(`${origin}${path}`, { redirect: 'follow', ...options });
  const body = options.method === 'HEAD' ? '' : await response.text();
  return { response, body };
}

async function mapConcurrent(items, limit, task) {
  let cursor = 0;
  const failures = [];
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try { await task(item); } catch (error) { failures.push(`${item}: ${error.message}`); }
    }
  }));
  return failures;
}

(async () => {
  const [home, french, favicon, sitemap, robots, llms, company, feed, frenchFeed, cms, api] = await Promise.all([
    get('/en/'), get('/fr/'), get('/favicon.png'), get('/sitemap.xml'), get('/robots.txt'),
    get('/llms.txt'), get('/company.json'), get('/feed.xml'), get('/fr/feed.xml'),
    get('/cms/'), get('/api/content')
  ]);
  assert.equal(home.response.status, 200);
  assert.equal(french.response.status, 200);
  assert.equal(favicon.response.status, 200);
  assert.match(favicon.response.headers.get('content-type') || '', /image\/png/);
  assert.match(home.body, /<link rel="icon" href="\/favicon\.png" type="image\/png">/);
  assert.match(home.body, /"logo":\{"@type":"ImageObject","url":"https:\/\/www\.space-tr\.com\/favicon\.png"/);
  assert.match(french.body, /<link rel="icon" href="\/favicon\.png" type="image\/png">/);
  assert.equal(sitemap.response.status, 200);
  assert.match(robots.body, /Sitemap: https:\/\/www\.space-tr\.com\/sitemap\.xml/);
  assert.match(llms.body, /\/company\.json/);
  const graph = JSON.parse(company.body)['@graph'];
  assert.equal(graph[0].logo.url, `${origin}/favicon.png`);
  assert.equal(graph[2].numberOfItems, 41);
  assert.match(feed.response.headers.get('content-type') || '', /application\/rss\+xml/);
  assert.match(frenchFeed.response.headers.get('content-type') || '', /application\/rss\+xml/);
  assert.equal(cms.response.status, 404);
  assert.match(api.response.headers.get('x-robots-tag') || '', /noindex/);

  const pageUrls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const resourceUrls = new Set(['/favicon.png', '/apple-touch-icon.png']);
  const pageFailures = await mapConcurrent(pageUrls, 8, async url => {
    const response = await fetch(url, { redirect: 'follow' });
    assert.equal(response.status, 200, `HTTP ${response.status}`);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return;
    const html = await response.text();
    assert.match(html, /<title>[^<]+<\/title>/i);
    assert.match(html, /<meta name="description"/i);
    for (const match of html.matchAll(/(?:src|poster)="([^"]+)"/g)) {
      const value = match[1];
      if (value.startsWith('/') && !value.startsWith('//')) resourceUrls.add(value.split('?')[0]);
    }
  });
  assert.deepEqual(pageFailures, []);
  const assetFailures = await mapConcurrent([...resourceUrls], 8, async path => {
    const response = await fetch(`${origin}${path}`, { method: 'HEAD', redirect: 'follow' });
    assert.ok(response.ok, `HTTP ${response.status}`);
  });
  assert.deepEqual(assetFailures, []);
  console.log(JSON.stringify({ origin, pages: pageUrls.length, resources: resourceUrls.size, portfolioBrands: graph[2].numberOfItems, cmsStatus: cms.response.status }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
